import { NextResponse } from "next/server";

// BFF route'u: Django refresh token'ını görecek tek yer. Django'ya karşı
// giriş yapar, refresh token'ı httpOnly bir cookie'de saklar ve access
// token'ı istemciye hem JSON gövdesinde (yalnızca bellekte tutulur, istemci
// taraflı apiClient çağrıları için — bkz. lib/token-store.ts) hem de ikinci,
// kısa ömürlü bir httpOnly cookie olarak verir (lib/api.ts'nin sunucu
// taraflı okumaları için — Server Component'ler herhangi bir istemci JS'i
// çalışmadan önce render edilir, bu yüzden bellek içi token onlar için henüz
// mevcut değildir). document.cookie/localStorage'ı okuyan istemci taraflı bir
// XSS saldırısı, yine de uzun ömürlü refresh token'ı sızdıramaz, çünkü o
// cookie tek başına yalnızca-httpOnly kalır, asla gövdede yer almaz.

const DJANGO_API_URL = process.env.DJANGO_API_URL ?? "http://localhost:8000/api/v1";
const REFRESH_COOKIE = "trugc_refresh";
const ACCESS_COOKIE = "trugc_access";
const REFRESH_MAX_AGE_DAYS = Number(process.env.REFRESH_TOKEN_LIFETIME_DAYS ?? 7);
const ACCESS_MAX_AGE_MINUTES = Number(process.env.ACCESS_TOKEN_LIFETIME_MINUTES ?? 30);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: true, code: "VALIDATION_ERROR", message: "E-posta ve şifre gereklidir." }, { status: 400 });
  }

  const djangoRes = await fetch(`${DJANGO_API_URL}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
  });

  const data = await djangoRes.json().catch(() => ({}));
  if (!djangoRes.ok) {
    return NextResponse.json(data, { status: djangoRes.status });
  }

  const { access, refresh, role, email, is_verified, user_id, is_staff, is_superuser } = data;
  const response = NextResponse.json({
    access,
    user: { id: user_id, email, role, isVerified: is_verified, isStaff: is_staff, isSuperuser: is_superuser },
  });

  response.cookies.set(REFRESH_COOKIE, refresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_MAX_AGE_DAYS * 24 * 60 * 60,
  });
  response.cookies.set(ACCESS_COOKIE, access, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_MAX_AGE_MINUTES * 60,
  });

  return response;
}
