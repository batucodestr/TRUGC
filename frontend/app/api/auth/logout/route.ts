import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Blacklists the refresh token server-side (so it can't be replayed even if
// it leaked) and clears the httpOnly cookie. Best-effort: if Django is
// unreachable or the token's already invalid, we still clear the cookie so
// the user is locally logged out either way.

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
