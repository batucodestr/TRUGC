import { NextResponse, type NextRequest } from "next/server";

// Route protection. This Next.js version (16.x) renamed the `middleware.ts`
// file convention to `proxy.ts` (function must be named/exported `proxy`,
// not `middleware`) — see node_modules/next/dist/docs/.../file-conventions/proxy.md.
// This is edge-level UX gating only (redirect away from an obviously
// signed-out state); the real authorization boundary is the Django API,
// which rejects any request without a valid access token or with the wrong
// role regardless of what this proxy does.

const SESSION_COOKIE = "trugc_session";

const ROLE_PREFIX: Record<string, "brand" | "creator"> = {
  brand: "brand",
  creator: "creator",
};

interface SessionCookie {
  user?: { role?: string; isStaff?: boolean; isSuperuser?: boolean };
}

function readSession(request: NextRequest): SessionCookie | null {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /manage is the hidden admin entry point — never linked from public UI.
  // Gated on the real is_staff flag (not just role === "admin"), since role is
  // a business-logic label while is_staff is the actual Django authorization
  // flag — superusers always have is_staff=True too, and moderators (who
  // share this same panel, just with fewer modules — see backend's
  // IsAdminRole|IsModerator pattern on every /manage-serving endpoint) are
  // staff without being superusers. This is edge-level UX gating only; the
  // real boundary is enforced per-endpoint on the backend.
  if (pathname.startsWith("/manage")) {
    const session = readSession(request);
    if (!session?.user?.role) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!session.user.isStaff) {
      if (pathname === "/manage/forbidden") return NextResponse.next();
      return NextResponse.rewrite(new URL("/manage/forbidden", request.url), { status: 403 });
    }
    return NextResponse.next();
  }

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const session = readSession(request);

  if (!session?.user?.role) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // /dashboard (the role picker) is open to any authenticated session.
  const segment = pathname.split("/")[2];
  const requiredRole = segment ? ROLE_PREFIX[segment] : undefined;

  if (requiredRole && session.user.role !== requiredRole) {
    const ownPath = session.user.role === "admin" ? "/manage" : `/dashboard/${session.user.role}`;
    return NextResponse.redirect(new URL(ownPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/manage/:path*"],
};
