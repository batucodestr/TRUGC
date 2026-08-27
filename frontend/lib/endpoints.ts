// Django REST API rotalarının merkezi kayıt defteri; backend/config/api_urls.py
// ve her uygulamanın urls.py'sini yansıtır. Bu dosyadaki hiçbir şey ağla
// konuşmaz — yalnızca endpoint'leri isimlendirir, böylece
// `lib/api.ts`/`lib/auth.ts`/`lib/api/*.ts` asla satır içinde sabit bir URL
// dizesi kullanmaz.
//
// Buradaki yollar API köküne görelidir — `NEXT_PUBLIC_API_BASE_URL` (istemci)
// ve `DJANGO_API_URL` (sunucu) zaten `/api/v1` önekini içerir (bkz.
// .env.example), bu yüzden burada TEKRARLANMAMALIDIR — bu, tam bir sayfa
// yükleme smoke test'iyle yakalanana kadar her apiClient çağrısında gerçek
// bir `/api/v1/api/v1/...` 404 hatasına yol açmıştı.
const API_BASE = "";

export const AUTH_ENDPOINTS = {
  register: `${API_BASE}/auth/register/`,
  login: `${API_BASE}/auth/login/`,
  logout: `${API_BASE}/auth/logout/`,
  refresh: `${API_BASE}/auth/token/refresh/`,
  me: `${API_BASE}/auth/me/`,
  users: `${API_BASE}/auth/users/`,
  myProfile: `${API_BASE}/auth/me/profile/`,
  changePassword: `${API_BASE}/auth/me/change-password/`,
  passwordResetRequest: `${API_BASE}/auth/password-reset/`,
  passwordResetConfirm: `${API_BASE}/auth/password-reset/confirm/`,
  verifyEmail: `${API_BASE}/auth/email/verify/`,
  resendVerificationEmail: `${API_BASE}/auth/email/resend/`,
  verificationSubmit: `${API_BASE}/auth/me/verification/`,
};

export const ENDPOINTS = {
  auth: AUTH_ENDPOINTS,
  creators: `${API_BASE}/creators/`,
  myCreator: `${API_BASE}/creators/me/`,
  creatorCategories: `${API_BASE}/creators/categories/`,
  mySocialAccounts: `${API_BASE}/creators/me/social-accounts/`,
  myPortfolio: `${API_BASE}/creators/me/portfolio/`,
  myPackages: `${API_BASE}/creators/me/packages/`,
  brands: `${API_BASE}/brands/`,
  myBrand: `${API_BASE}/brands/me/`,
  campaigns: `${API_BASE}/campaigns/`,
  applications: `${API_BASE}/applications/`,
  conversations: `${API_BASE}/messages/`,
  reviews: `${API_BASE}/reviews/`,
  reports: `${API_BASE}/reports/`,
  notifications: `${API_BASE}/notifications/`,
  analytics: {
    brand: `${API_BASE}/analytics/brand/dashboard/`,
    creator: `${API_BASE}/analytics/creator/dashboard/`,
    admin: `${API_BASE}/analytics/admin/dashboard/`,
  },
  payments: `${API_BASE}/payments/transactions/`,
  verificationsPending: `${API_BASE}/auth/verifications/pending/`,
  adminConversations: `${API_BASE}/messages/admin/conversations/`,
  systemStatus: `${API_BASE}/auth/admin/system-status/`,
  adminLogs: `${API_BASE}/auth/admin/logs/`,
  adminRoles: `${API_BASE}/auth/admin/roles/`,
  userBulkAction: `${API_BASE}/auth/users/bulk-action/`,
  campaignBulkAction: `${API_BASE}/campaigns/bulk/`,
  notificationBroadcast: `${API_BASE}/notifications/admin/broadcast/`,
  analyticsExport: `${API_BASE}/analytics/admin/export/`,
};

export function creatorDetail(id: string | number) {
  return `${ENDPOINTS.creators}${id}/`;
}

export function brandDetail(id: string | number) {
  return `${ENDPOINTS.brands}${id}/`;
}

export function campaignDetail(id: string | number) {
  return `${ENDPOINTS.campaigns}${id}/`;
}

export function campaignMedia(campaignId: string | number) {
  return `${ENDPOINTS.campaigns}${campaignId}/media/`;
}

export function campaignDeliverables(campaignId: string | number) {
  return `${ENDPOINTS.campaigns}${campaignId}/deliverables/`;
}

export function applicationDetail(id: string | number) {
  return `${ENDPOINTS.applications}${id}/`;
}

export function conversationMessages(conversationId: string | number) {
  return `${ENDPOINTS.conversations}${conversationId}/messages/`;
}

export function notificationDetail(id: string | number) {
  return `${ENDPOINTS.notifications}${id}/`;
}

export function verificationReview(id: string | number) {
  return `${API_BASE}/auth/verifications/${id}/review/`;
}

export function reportResolve(id: string | number) {
  return `${ENDPOINTS.reports}${id}/resolve/`;
}

export function myPackageDetail(id: string | number) {
  return `${ENDPOINTS.myPackages}${id}/`;
}

export function userDetail(id: string | number) {
  return `${AUTH_ENDPOINTS.users}${id}/`;
}

export function userAction(id: string | number) {
  return `${AUTH_ENDPOINTS.users}${id}/action/`;
}

export function brandAdminDetail(id: string | number) {
  return `${ENDPOINTS.brands}${id}/manage/`;
}

export function creatorAdminDetail(id: string | number) {
  return `${ENDPOINTS.creators}${id}/manage/`;
}

export function roleGroupDetail(id: string | number) {
  return `${ENDPOINTS.adminRoles}${id}/`;
}

export function adminConversationMessages(conversationId: string | number) {
  return `${ENDPOINTS.adminConversations}${conversationId}/messages/`;
}

export function adminMessageDetail(id: string | number) {
  return `${API_BASE}/messages/admin/messages/${id}/`;
}
