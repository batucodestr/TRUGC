import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Refresh token'ı sunucu tarafında kara listeye alır (sızsa bile tekrar
// oynatılamaz) ve httpOnly cookie'yi temizler. En iyi çaba (best-effort):
// Django erişilemezse veya token zaten geçersizse, kullanıcı her durumda
// yerel olarak çıkış yapmış olsun diye yine de cookie'yi temizleriz.

const DJANGO_API_URL = process.env.DJANGO_API_URL ?? "http://localhost:8000/api/v1";
const REFRESH_COOKIE = "trugc_refresh";
const ACCESS_COOKIE = "trugc_access";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const refresh = cookieStore.get(REFRESH_COOKIE)?.value;
  const authHeader = request.headers.get("authorization");

  if (refresh) {
    await fetch(`${DJANGO_API_URL}/auth/logout/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({ refresh }),
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(REFRESH_COOKIE);
  response.cookies.delete(ACCESS_COOKIE);
  return response;
}
