import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// httpOnly refresh cookie'sini yeni bir access token ile değiştirir.
// lib/api.ts tarafından bir 401'de ve lib/auth.ts'nin restoreSession()'ı
// tarafından ilk yüklemede çağrılır (bellek içi access token her tam sayfa
// yenilemesinden sonra kaybolur).

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

  // Bu backend'in ayarlarında SimpleJWT, ROTATE_REFRESH_TOKENS ile
  // yapılandırılmıştır, bu yüzden her çağrıda yeni bir refresh token geri
  // gelir — cookie'yi her seferinde döndür (BLACKLIST_AFTER_ROTATION, eskisinin
  // artık sunucu tarafında geçersiz olduğu anlamına gelir zaten).
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
