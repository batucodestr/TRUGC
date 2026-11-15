import mimetypes

from django.core import signing
from django.http import FileResponse, Http404
from rest_framework import permissions
from rest_framework.views import APIView

from . import signed_files

INLINE_TYPES = ("image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf", "video/mp4", "video/webm", "video/quicktime")


class SignedFileView(APIView):
    """İmzalı adresle dosya sunar. JWT gerekmez (``<img src>`` başlık gönderemez);
    yetki imzanın içindeki kullanıcıya/dosyaya bağlıdır ve 10 dakikada dolar.
    Yetki imza üretilirken (katılımcı kontrolüyle) verildiği için burada ikinci
    bir kez, dosyanın hâlâ o kullanıcının erişimine açık olduğu doğrulanır."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request, token):
        try:
            data = signed_files.verify(token)
        except signing.BadSignature:
            raise Http404
        file_field, name = self._resolve(data)
        if file_field is None:
            raise Http404
        content_type = mimetypes.guess_type(name)[0] or "application/octet-stream"
        response = FileResponse(file_field.open("rb"), content_type=content_type)
        disposition = "inline" if content_type in INLINE_TYPES else "attachment"
        response["Content-Disposition"] = f'{disposition}; filename="{name.split("/")[-1]}"'
        response["X-Content-Type-Options"] = "nosniff"
        response["Cache-Control"] = "private, max-age=300"
        return response

    @staticmethod
    def _resolve(data):
        from apps.accounts.models import User

        user = User.objects.filter(pk=data["u"], is_active=True).first()
        if user is None:
            return None, ""
        if data["k"] == signed_files.KIND_MESSAGE_ATTACHMENT:
            from apps.messaging.models import Attachment

            att = Attachment.objects.select_related("message__conversation").filter(pk=data["i"]).first()
            if att and (
                att.message.conversation.participants.filter(pk=user.pk).exists()
                or user.is_staff
                or user.role in ("admin", "moderator")
            ):
                return att.file, att.file_name or att.file.name
        elif data["k"] == signed_files.KIND_SUBMISSION:
            from apps.collaborations.models import ContentSubmission

            sub = ContentSubmission.objects.select_related("collaboration__brand", "collaboration__creator").filter(pk=data["i"]).first()
            if sub and sub.file and (
                sub.collaboration.brand.user_id == user.pk
                or sub.collaboration.creator.user_id == user.pk
                or user.is_staff
                or user.role in ("admin", "moderator")
            ):
                return sub.file, sub.file.name
        return None, ""
