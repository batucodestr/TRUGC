import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Exchanges the httpOnly refresh cookie for a new access token. Called by
// lib/api.ts on a 401, and by lib/auth.ts's restoreSession() on first load
// (the in-memory access token is gone after every full page reload).

const DJANGO_API_URL = process.env.DJANGO_API_URL ?? "http://localhost:8000/api/v1";
const REFRESH_COOKIE = "trugc_refresh";
const ACCESS_COOKIE = "trugc_access";
const REFRESH_MAX_AGE_DAYS = Number(process.env.REFRESH_TOKEN_LIFETIME_DAYS ?? 7);
const ACCESS_MAX_AGE_MINUTES = Number(process.env.ACCESS_TOKEN_LIFETIME_MINUTES ?? 30);

export async function POST() {
  const cookieStore = await cookies();
  const refresh = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!refresh) {
    return NextResponse.json({ error: true, code: "UNAUTHORIZED", message: "Oturum bulunamadı." }, { status: 401 });
  }

  const djangoRes = await fetch(`${DJANGO_API_URL}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  const data = await djangoRes.json().catch(() => ({}));
  if (!djangoRes.ok) {
    const response = NextResponse.json(data, { status: djangoRes.status });
    response.cookies.delete(REFRESH_COOKIE);
    return response;
  }

  const response = NextResponse.json({ access: data.access });

  // SimpleJWT is configured with ROTATE_REFRESH_TOKENS in this backend's
  // settings, so a new refresh token comes back on every call — rotate the
  // cookie every time (BLACKLIST_AFTER_ROTATION means the old one is now
  // invalid server-side regardless).
  if (data.refresh) {
    response.cookies.set(REFRESH_COOKIE, data.refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: REFRESH_MAX_AGE_DAYS * 24 * 60 * 60,
    });
  }
  response.cookies.set(ACCESS_COOKIE, data.access, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_MAX_AGE_MINUTES * 60,
  });

  return response;
}
