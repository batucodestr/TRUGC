from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.models import Group, Permission
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from rest_framework import filters, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.notifications.models import NotificationType
from apps.notifications.services import notify_user

from .emails import send_password_reset_email, send_verification_email
from .exceptions import error_response
from .models import AdminActionLog, Role, User, VerificationStatus, log_admin_action
from .permissions import IsAdminRole, IsModerator
from .serializers import (
    AdminActionLogSerializer,
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    EmailVerificationConfirmSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileSerializer,
    RegisterSerializer,
    UserSerializer,
    VerificationQueueSerializer,
    VerificationStatusSerializer,
    VerificationSubmitSerializer,
)


class RegisterView(generics.CreateAPIView):
    """Register a new Creator or Brand account."""

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        send_verification_email(user)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    """Obtain a JWT pair. Response includes the user's role."""

    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"


class LogoutView(APIView):
    """Blacklists the provided refresh token."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request={"application/json": {"type": "object", "properties": {"refresh": {"type": "string"}}}})
    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return error_response("VALIDATION_ERROR", "Refresh token gereklidir.", status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return error_response("VALIDATION_ERROR", "Geçersiz veya süresi dolmuş token.", status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    """Retrieve or update the authenticated user's account."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ProfileView(generics.RetrieveUpdateAPIView):
    """Retrieve or update the authenticated user's profile."""

    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user.profile


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        update_session_auth_hash(request, user)
        return Response({"detail": "Password updated successfully."})


class VerificationSubmitView(generics.UpdateAPIView):
    """Submit identity verification documents for review."""

    serializer_class = VerificationSubmitSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user.verification


class PasswordResetRequestView(APIView):
    """Sends a password reset link if the email exists. Never reveals whether it does."""

    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=serializer.validated_data["email"]).first()
        if user is not None:
            send_password_reset_email(user)
        return Response({"detail": "If that email exists, a reset link has been sent."})


class PasswordResetConfirmView(APIView):
    """Sets a new password given a valid uid/token pair from the reset email."""

    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password has been reset successfully."})


class ResendVerificationEmailView(APIView):
    """Resends the email-confirmation link to the authenticated (but unverified) user."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "auth"

    def post(self, request):
        if request.user.email_verified:
            return Response({"detail": "Email is already verified."})
        send_verification_email(request.user)
        return Response({"detail": "Verification email sent."})


class VerifyEmailView(APIView):
    """Confirms a user's email address given the uid/token pair from the verification email."""

    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        serializer = EmailVerificationConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Email verified successfully."})


class UserListView(generics.ListAPIView):
    """Admin directory of every platform user. Powers the admin dashboard's user-management screen."""

    queryset = User.objects.select_related("profile", "verification").all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, (IsAdminRole | IsModerator)]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["role", "is_active", "is_verified", "is_banned"]
    search_fields = ["email", "profile__first_name", "profile__last_name"]
    ordering_fields = ["date_joined", "email", "last_login"]


class PendingVerificationListView(generics.ListAPIView):
    """Moderator queue of identity-verification submissions awaiting review."""

    serializer_class = VerificationQueueSerializer
    permission_classes = [permissions.IsAuthenticated, IsModerator]

    def get_queryset(self):
        return VerificationStatus.objects.filter(status=VerificationStatus.Status.PENDING).select_related("user")


class VerificationReviewView(APIView):
    """Moderator approval/rejection of a pending identity-verification submission."""

    permission_classes = [permissions.IsAuthenticated, IsModerator]

    def post(self, request, pk):
        verification = get_object_or_404(VerificationStatus, pk=pk)
        decision = request.data.get("decision")
        if decision not in ("approve", "reject"):
            return error_response("VALIDATION_ERROR", "decision 'approve' veya 'reject' olmalıdır.", status.HTTP_400_BAD_REQUEST)

        verification.status = (
            VerificationStatus.Status.VERIFIED if decision == "approve" else VerificationStatus.Status.REJECTED
        )
        verification.notes = request.data.get("notes", "")
        verification.reviewed_at = timezone.now()
        verification.reviewed_by = request.user
        verification.save(update_fields=["status", "notes", "reviewed_at", "reviewed_by"])
        log_admin_action(request.user, f"verification.{decision}", "verification", verification.id, verification.notes)

        if decision == "approve":
            verification.user.is_verified = True
            verification.user.save(update_fields=["is_verified"])
            notify_user(
                user=verification.user,
                title="Verification approved",
                body="Your identity verification has been approved.",
                notification_type=NotificationType.SYSTEM,
            )
        else:
            notify_user(
                user=verification.user,
                title="Verification rejected",
                body=verification.notes or "Your identity verification was rejected.",
                notification_type=NotificationType.SYSTEM,
            )

        return Response(VerificationStatusSerializer(verification).data)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin: view/edit/delete a single platform user."""

    queryset = User.objects.select_related("profile", "verification").all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, (IsAdminRole | IsModerator)]

    def perform_destroy(self, instance):
        log_admin_action(self.request.user, "user.delete", "user", instance.id, instance.email)
        instance.delete()


VALID_USER_ACTIONS = {"verify", "unverify", "suspend", "activate", "ban", "unban", "change_role", "delete"}


class UserAdminActionView(APIView):
    """Single-user moderation actions: verify / suspend / activate / ban / unban / change_role / delete."""

    permission_classes = [permissions.IsAuthenticated, (IsAdminRole | IsModerator)]

    def post(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        op = request.data.get("action")
        if op not in VALID_USER_ACTIONS:
            return error_response("VALIDATION_ERROR", "Geçersiz işlem.", status.HTTP_400_BAD_REQUEST)

        if op == "verify":
            user.is_verified = True
            user.save(update_fields=["is_verified"])
        elif op == "unverify":
            user.is_verified = False
            user.save(update_fields=["is_verified"])
        elif op == "suspend":
            user.is_active = False
            user.save(update_fields=["is_active"])
        elif op == "activate":
            user.is_active = True
            user.is_banned = False
            user.save(update_fields=["is_active", "is_banned"])
        elif op == "ban":
            user.is_active = False
            user.is_banned = True
            user.ban_reason = request.data.get("reason", "")
            user.save(update_fields=["is_active", "is_banned", "ban_reason"])
        elif op == "unban":
            user.is_banned = False
            user.ban_reason = ""
            user.save(update_fields=["is_banned", "ban_reason"])
        elif op == "change_role":
            new_role = request.data.get("role")
            if new_role not in Role.values:
                return error_response("VALIDATION_ERROR", "Geçersiz rol.", status.HTTP_400_BAD_REQUEST)
            user.role = new_role
            user.save(update_fields=["role"])
        elif op == "delete":
            log_admin_action(request.user, "user.delete", "user", user.id, user.email)
            user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        log_admin_action(request.user, f"user.{op}", "user", user.id, request.data.get("reason", ""))
        return Response(UserSerializer(user).data)


class UserBulkActionView(APIView):
    """Bulk moderation: {action, ids: [...], role?}."""

    permission_classes = [permissions.IsAuthenticated, (IsAdminRole | IsModerator)]

    def post(self, request):
        op = request.data.get("action")
        ids = request.data.get("ids") or []
        if op not in VALID_USER_ACTIONS or not ids:
            return error_response("VALIDATION_ERROR", "Geçersiz işlem veya boş seçim.", status.HTTP_400_BAD_REQUEST)

        users = User.objects.filter(id__in=ids)
        count = users.count()

        if op == "suspend":
            users.update(is_active=False)
        elif op == "activate":
            users.update(is_active=True, is_banned=False)
        elif op == "ban":
            users.update(is_active=False, is_banned=True, ban_reason=request.data.get("reason", ""))
        elif op == "verify":
            users.update(is_verified=True)
        elif op == "change_role":
            new_role = request.data.get("role")
            if new_role not in Role.values:
                return error_response("VALIDATION_ERROR", "Geçersiz rol.", status.HTTP_400_BAD_REQUEST)
            users.update(role=new_role)
        elif op == "delete":
            users.delete()
        else:
            return error_response("VALIDATION_ERROR", "Bu işlem toplu olarak desteklenmiyor.", status.HTTP_400_BAD_REQUEST)

        log_admin_action(request.user, f"user.bulk_{op}", "user", ",".join(map(str, ids)), f"{count} users")
        return Response({"updated": count})


class AdminActionLogListView(generics.ListAPIView):
    """Audit trail for /manage — every admin mutation, newest first."""

    queryset = AdminActionLog.objects.select_related("actor").all()
    serializer_class = AdminActionLogSerializer
    permission_classes = [permissions.IsAuthenticated, (IsAdminRole | IsModerator)]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["action", "target_type", "actor"]
    ordering_fields = ["created_at"]


def _serialize_group(group):
    return {
        "id": group.id,
        "name": group.name,
        "user_count": group.user_set.count(),
        "permissions": [{"id": p.id, "codename": p.codename, "name": p.name} for p in group.permissions.all()],
    }


class RoleGroupListView(APIView):
    """Roles & Permissions screen: list Django auth Groups (Creators/Brands/Moderators/Admins,
    seeded by manage.py seed_groups) and every available Permission, plus create a new Group."""

    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get(self, request):
        groups = Group.objects.prefetch_related("permissions", "user_set").all()
        permissions_list = Permission.objects.select_related("content_type").all()
        return Response(
            {
                "groups": [_serialize_group(g) for g in groups],
                "permissions": [
                    {"id": p.id, "codename": p.codename, "name": p.name, "app_label": p.content_type.app_label}
                    for p in permissions_list
                ],
            }
        )

    def post(self, request):
        name = request.data.get("name", "").strip()
        if not name:
            return error_response("VALIDATION_ERROR", "Rol adı gereklidir.", status.HTTP_400_BAD_REQUEST)
        group, created = Group.objects.get_or_create(name=name)
        if not created:
            return error_response("VALIDATION_ERROR", "Bu isimde bir rol zaten var.", status.HTTP_400_BAD_REQUEST)
        log_admin_action(request.user, "role.create", "group", group.id, name)
        return Response(_serialize_group(group), status=status.HTTP_201_CREATED)


class RoleGroupDetailView(APIView):
    """Update a group's assigned permissions, or delete the group."""

    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def patch(self, request, pk):
        group = get_object_or_404(Group, pk=pk)
        permission_ids = request.data.get("permission_ids")
        if permission_ids is not None:
            group.permissions.set(Permission.objects.filter(id__in=permission_ids))
        log_admin_action(request.user, "role.update_permissions", "group", group.id, group.name)
        return Response(_serialize_group(group))

    def delete(self, request, pk):
        group = get_object_or_404(Group, pk=pk)
        log_admin_action(request.user, "role.delete", "group", group.id, group.name)
        group.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


PROCESS_STARTED_AT = timezone.now()


class SystemStatusView(APIView):
    """Admin-only platform health snapshot for the /manage dashboard's system-status panel."""

    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get(self, request):
        from django.db import connection
        from django_redis import get_redis_connection

        checks = {}

        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            checks["database"] = "ok"
        except Exception as exc:  # noqa: BLE001 - report any failure, not just connection errors
            checks["database"] = f"error: {exc}"

        try:
            get_redis_connection("default").ping()
            checks["redis"] = "ok"
        except Exception as exc:  # noqa: BLE001
            checks["redis"] = f"error: {exc}"

        try:
            from config.celery import app as celery_app

            pings = celery_app.control.inspect(timeout=1.0).ping() or {}
            checks["celery"] = "ok" if pings else "error: no workers responded"
            worker_count = len(pings)
        except Exception as exc:  # noqa: BLE001
            checks["celery"] = f"error: {exc}"
            worker_count = 0

        # Any request reaching this view has already been routed through Caddy
        # (it's the only container with published ports) — a response is
        # therefore live proof Caddy itself is up.
        checks["caddy"] = "ok"

        from apps.brands.models import Brand
        from apps.campaigns.models import Campaign
        from apps.creators.models import Creator
        from apps.messaging.models import Conversation

        counts = {
            "users": User.objects.count(),
            "creators": Creator.objects.count(),
            "brands": Brand.objects.count(),
            "campaigns": Campaign.objects.count(),
            "conversations": Conversation.objects.count(),
        }

        import shutil

        disk = shutil.disk_usage("/")
        disk_usage = {
            "total_gb": round(disk.total / 1024**3, 1),
            "used_gb": round(disk.used / 1024**3, 1),
            "percent": round(disk.used / disk.total * 100, 1),
        }

        memory_usage = None
        try:
            meminfo = {}
            with open("/proc/meminfo") as f:
                for line in f:
                    key, _, rest = line.partition(":")
                    meminfo[key] = int(rest.strip().split()[0])  # kB
            total_kb = meminfo.get("MemTotal", 0)
            available_kb = meminfo.get("MemAvailable", 0)
            used_kb = max(total_kb - available_kb, 0)
            if total_kb:
                memory_usage = {
                    "total_gb": round(total_kb / 1024**2, 1),
                    "used_gb": round(used_kb / 1024**2, 1),
                    "percent": round(used_kb / total_kb * 100, 1),
                }
        except OSError:
            pass

        uptime_seconds = (timezone.now() - PROCESS_STARTED_AT).total_seconds()

        healthy = all(v == "ok" for v in checks.values())
        return Response(
            {
                "status": "ok" if healthy else "degraded",
                "checks": checks,
                "worker_count": worker_count,
                "counts": counts,
                "disk": disk_usage,
                "memory": memory_usage,
                "uptime_seconds": int(uptime_seconds),
                "checked_at": timezone.now(),
            }
        )
