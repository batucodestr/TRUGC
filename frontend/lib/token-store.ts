// In-memory access-token holder. Never persisted (no localStorage/sessionStorage)
// so it isn't reachable by an XSS payload reading storage — it simply
// disappears on full page reload, at which point `restoreSession()` in
// lib/auth.ts silently exchanges the httpOnly refresh cookie for a new one.
// The refresh token itself never touches client JS; it lives only in the
// httpOnly cookie set by the Next.js route handlers under app/api/auth/*.

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
