from rest_framework_simplejwt.views import TokenRefreshView

from django.urls import path

from . import views

app_name = "accounts"

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("password-reset/", views.PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("password-reset/confirm/", views.PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("email/verify/", views.VerifyEmailView.as_view(), name="verify-email"),
    path("email/resend/", views.ResendVerificationEmailView.as_view(), name="resend-verification-email"),
    path("me/", views.MeView.as_view(), name="me"),
    path("users/", views.UserListView.as_view(), name="user-list"),
    path("me/profile/", views.ProfileView.as_view(), name="my-profile"),
    path("me/change-password/", views.ChangePasswordView.as_view(), name="change-password"),
    path("me/verification/", views.VerificationSubmitView.as_view(), name="verification-submit"),
    path("verifications/pending/", views.PendingVerificationListView.as_view(), name="verification-pending-list"),
    path("verifications/<int:pk>/review/", views.VerificationReviewView.as_view(), name="verification-review"),
    path("admin/system-status/", views.SystemStatusView.as_view(), name="system-status"),
    path("users/<int:pk>/", views.UserDetailView.as_view(), name="user-detail"),
    path("users/<int:pk>/action/", views.UserAdminActionView.as_view(), name="user-admin-action"),
    path("users/bulk-action/", views.UserBulkActionView.as_view(), name="user-bulk-action"),
    path("admin/logs/", views.AdminActionLogListView.as_view(), name="admin-action-log-list"),
    path("admin/roles/", views.RoleGroupListView.as_view(), name="role-group-list"),
    path("admin/roles/<int:pk>/", views.RoleGroupDetailView.as_view(), name="role-group-detail"),
]
