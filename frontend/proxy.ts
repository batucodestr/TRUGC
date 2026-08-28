import { NextResponse, type NextRequest } from "next/server";

// Route koruması. Bu Next.js sürümü (16.x), `middleware.ts` dosya kuralının
// adını `proxy.ts` olarak değiştirdi (fonksiyon `middleware` değil `proxy`
// olarak adlandırılıp export edilmeli) — bkz.
// node_modules/next/dist/docs/.../file-conventions/proxy.md.
// Bu yalnızca edge seviyesinde bir UX kontrolüdür (açıkça çıkış yapılmış bir
// durumdan uzaklaştırma); gerçek yetkilendirme sınırı, bu proxy ne yaparsa
// yapsın geçerli bir access token'ı olmayan veya yanlış role sahip her isteği
// reddeden Django API'sidir.

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

  // /manage gizli admin giriş noktasıdır — hiçbir zaman genel arayüzden
  // bağlantı verilmez. Yalnızca role === "admin" değil, gerçek is_staff
  // bayrağına göre kontrol edilir; çünkü role bir iş mantığı etiketiyken
  // is_staff asıl Django yetkilendirme bayrağıdır — superuser'lar da her
  // zaman is_staff=True'ya sahiptir ve moderatörler (aynı paneli, yalnızca
  // daha az modülle paylaşırlar — her /manage endpoint'indeki backend'in
  // IsAdminRole|IsModerator kalıbına bakın) superuser olmadan staff'tır.
  // Bu yalnızca edge seviyesinde bir UX kontrolüdür; gerçek sınır backend'de
  // endpoint bazında uygulanır.
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

  // Creator keşfi markalar içindir — giriş yapmış bir creator, /creators'a
  // (liste veya tekil profil) doğrudan URL ile de gitmeye çalışsa kendi
  // panosuna yönlendirilir. Anonim ziyaretçiler ve markalar etkilenmez.
  if (pathname.startsWith("/creators")) {
    const session = readSession(request);
    if (session?.user?.role === "creator") {
      return NextResponse.redirect(new URL("/dashboard/creator", request.url));
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

  // /dashboard (rol seçici), kimliği doğrulanmış her oturuma açıktır.
  const segment = pathname.split("/")[2];
  const requiredRole = segment ? ROLE_PREFIX[segment] : undefined;

  if (requiredRole && session.user.role !== requiredRole) {
    const ownPath = session.user.role === "admin" ? "/manage" : `/dashboard/${session.user.role}`;
    return NextResponse.redirect(new URL(ownPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/manage/:path*", "/creators/:path*"],
};
