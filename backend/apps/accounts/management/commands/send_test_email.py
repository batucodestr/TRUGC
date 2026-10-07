"""E-posta altyapısını canlı olarak doğrulamak için tek seferlik gönderim.

Kullanım (container içinde):

    docker compose exec backend python manage.py send_test_email ben@ornegim.com

Sağlayıcı hatasını gizlemez: ``fail_silently=False`` ile gönderir, böylece
yanlış anahtar / doğrulanmamış alan adı gibi sorunlar komutun çıktısında
doğrudan görünür (uygulama akışı bunları yalnızca log'a yazar).
"""

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Yapılandırılmış e-posta backend'i üzerinden verilen adrese test e-postası gönderir."

    def add_arguments(self, parser):
        parser.add_argument("recipient", help="Test e-postasının gideceği adres")
        parser.add_argument(
            "--subject",
            default="TRUGC e-posta testi",
            help="Konu satırı (varsayılan: 'TRUGC e-posta testi')",
        )

    def handle(self, *args, **options):
        recipient = options["recipient"]
        backend_path = settings.EMAIL_BACKEND
        sender = settings.DEFAULT_FROM_EMAIL

        self.stdout.write(f"Backend : {backend_path}")
        self.stdout.write(f"Gönderen: {sender}")
        self.stdout.write(f"Alıcı   : {recipient}")
        if backend_path.endswith("console.EmailBackend"):
            self.stdout.write(
                self.style.WARNING(
                    "DİKKAT: console backend etkin — e-posta gerçekten gönderilmeyecek, "
                    "yalnızca aşağıya yazılacak. RESEND_API_KEY tanımlı mı?"
                )
            )

        text = (
            "Bu bir TRUGC test e-postasıdır.\n\n"
            f"Backend: {backend_path}\n"
            f"Gönderen: {sender}\n\n"
            "Bu mesajı aldıysanız doğrulama ve şifre sıfırlama e-postaları da çalışıyor."
        )
        html = (
            "<p>Bu bir <strong>TRUGC test e-postasıdır</strong>.</p>"
            f"<p>Backend: <code>{backend_path}</code><br>Gönderen: <code>{sender}</code></p>"
            "<p>Bu mesajı aldıysanız doğrulama ve şifre sıfırlama e-postaları da çalışıyor.</p>"
        )

        message = EmailMultiAlternatives(
            subject=options["subject"],
            body=text,
            from_email=sender,
            to=[recipient],
            connection=get_connection(fail_silently=False),
        )
        message.attach_alternative(html, "text/html")

        try:
            sent = message.send()
        except Exception as exc:  # sağlayıcı hatasını olduğu gibi göster
            raise CommandError(f"Gönderim başarısız: {exc.__class__.__name__}: {exc}") from exc

        if not sent:
            raise CommandError("Gönderim başarısız: backend 0 mesaj gönderildiğini bildirdi.")
        self.stdout.write(self.style.SUCCESS(f"Gönderildi → {recipient}"))
