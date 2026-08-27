// Bellekte tutulan access token deposu. Asla kalıcı hale getirilmez
// (localStorage/sessionStorage yok), böylece storage'ı okuyan bir XSS
// saldırısıyla erişilemez — tam sayfa yenilemede basitçe kaybolur, bu noktada
// lib/auth.ts'deki `restoreSession()`, httpOnly refresh cookie'sini sessizce
// yenisiyle değiştirir. Refresh token'ın kendisi hiçbir zaman istemci JS'ine
// dokunmaz; yalnızca app/api/auth/* altındaki Next.js route handler'ları
// tarafından ayarlanan httpOnly cookie'de yaşar.

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
