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
const ACCESS_COOKIE = "trugc_access";
const REFRESH_COOKIE = "trugc_refresh";
const DJANGO_API_URL = process.env.DJANGO_API_URL ?? "http://localhost:8000/api/v1";
const REFRESH_MAX_AGE_DAYS = Number(process.env.REFRESH_TOKEN_LIFETIME_DAYS ?? 7);
const ACCESS_MAX_AGE_MINUTES = Number(process.env.ACCESS_TOKEN_LIFETIME_MINUTES ?? 30);

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

/**
 * Access token'ın süresi dolmuş mu? **Doğrulama yapmaz** — imzayı yalnızca
 * Django doğrular; buradaki tek soru "bu token'la istek atmaya değer mi".
 *
 * Gerekli, çünkü cookie bazen token'dan uzun yaşar (saat kayması, maxAge ile
 * exp'in ayrışması). O durumda proxy "cookie var" diye yenilemeyi atlıyor,
 * sunucu tarafı fetch 401 alıyor ve sayfa çöküyordu.
 *
 * Okunamayan bir payload'da `false` döner: şüphede kalınca davranış
 * değişmez, token olduğu gibi kullanılır.
 */
function isExpiredJwt(token: string): boolean {
  const payload = token.split(".")[1];
  if (!payload) return false;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    if (typeof json.exp !== "number") return false;
    // 10 saniye pay: render sırasında dolacak bir token'la yola çıkmayalım.
    return json.exp * 1000 <= Date.now() + 10_000;
  } catch {
    return false;
  }
}

/**
 * Refresh token'ı kesin olarak kullanılamaz mı (biçimi bozuk, süresi dolmuş)?
 *
 * ``isExpiredJwt``den ayrı durur, çünkü burada şüphenin yönü terstir: access
 * token'da şüphede kalınca token kullanılır, refresh token'da ise oturumu
 * ölü ilan etmek için **kesinlik** gerekir. Süresi dolmamış bir token'ın
 * reddedilmesi çoğu zaman oturumun bitmesi değil, bir yarıştır (bkz.
 * ``withRefreshedAccessCookie``).
 */
function isDefinitelyDeadToken(token: string): boolean {
  const payload = token.split(".")[1];
  if (!payload) return true;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    if (typeof json.exp !== "number") return true;
    return json.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function signedOutRedirect(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  const response = NextResponse.redirect(loginUrl);
  // Bayat cookie'ler kalırsa kullanıcı giriş ekranına her gelişinde aynı
  // ölü oturumla geri dönmeye çalışır.
  for (const name of [SESSION_COOKIE, ACCESS_COOKIE, REFRESH_COOKIE]) {
    response.cookies.delete(name);
  }
  return response;
}

/**
 * Server Component'lerin kullandığı access cookie'sini, süresi dolmuşsa
 * yenileyerek isteğe geri koyar.
 *
 * **Neden gerekli:** access token yalnızca bellekte yaşar; Server
 * Component'ler onu göremediği için ayrıca kısa ömürlü (30 dk) httpOnly bir
 * `trugc_access` cookie'si yazılır (bkz. app/api/auth/login|refresh). Bu
 * cookie yalnızca istemci tarafı bir refresh olduğunda tazeleniyordu ve o da
 * yalnızca tam sayfa yüklemesinde (AuthProvider) veya istemci taraflı bir
 * istek 401 aldığında çalışıyordu. Sonuç: 30 dakikadan uzun süre sitede
 * kalan kullanıcı "Mesajlar"a veya "Kampanyalar"a tıkladığında sunucu
 * tarafı fetch'ler token'sız gidiyor, 401 alıyor ve sayfa veri yerine hata
 * ekranı basıyordu (frontend loglarındaki "Bu işlem için giriş yapmanız
 * gerekiyor" yığını). İstemci tarafı gezinmede AuthProvider yeniden
 * çalışmadığı için durum sayfa elle yenilenene kadar sürüyordu.
 *
 * Yenileme burada yapılır çünkü cookie yazabilen tek katman proxy'dir
 * (Server Component'ler cookie yazamaz). Yeni token hem yanıta (tarayıcı
 * için) hem de yukarı doğru iletilen istek başlığına yazılır — ikincisi
 * olmadan düzeltme bir sonraki gezinmeye kadar işe yaramazdı.
 *
 * İki farklı başarısızlık ayrı ayrı ele alınır:
 *
 * * **Geçici hata** (ağ sorunu, 5xx): hiçbir cookie silinmez, istek olduğu
 *   gibi devam eder. Django'nun bir saniyelik hıçkırığı kullanıcıyı
 *   oturumdan atmamalı.
 * * **Oturum kesin olarak bitmiş** (Django reddetti VE token'ın süresi
 *   gerçekten dolmuş/biçimi bozuk): kullanıcı /login'e yönlendirilir ve
 *   bayat cookie'ler silinir. Aksi halde sayfa token'sız render edilip 401
 *   yiyor ve kullanıcı "oturumunuz sona erdi" yerine ÇÖKME ekranı (500)
 *   görüyordu.
 * * **Reddedildi ama token'ın süresi dolmamış**: bu neredeyse her zaman bir
 *   yarıştır. SimpleJWT ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION ile
 *   çalıştığı için eşzamanlı iki yenilemeden biri token'ı döndürür, diğeri
 *   kara listeye düşmüş token'la 401 alır. Burada cookie silinirse kullanıcı
 *   kendi paralel isteği yüzünden oturumdan atılırdı — hiçbir şey yapılmaz,
 *   bir sonraki istek kazananın yazdığı taze cookie ile gelir.
 */
async function withRefreshedAccessCookie(request: NextRequest): Promise<NextResponse> {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;

  // Prefetch'te yenileme yapılmaz. Her yenileme refresh token'ını döndürdüğü
  // için (ROTATE_REFRESH_TOKENS), kullanıcı hiçbir şeye tıklamadan yapılan
  // prefetch'lerin token döndürmesi gereksiz churn üretir. Başlık adları
  // Next'in kendi sabitlerinden gelir (node_modules/next/dist/client/
  // components/app-router-headers.js): "next-router-prefetch" tam sayfa,
  // "next-router-segment-prefetch" segment prefetch'idir.
  //
  // Bu yalnızca bir optimizasyondur, güvenlik ağı değil: yarışı kaybeden
  // istek aşağıda cookie'lere dokunmadan geçer, bu yüzden başlık bir gün
  // değişse bile kullanıcı oturumdan atılmaz.
  const isPrefetch =
    request.headers.has("next-router-prefetch") ||
    request.headers.has("next-router-segment-prefetch") ||
    request.headers.get("purpose") === "prefetch";

  if (!hasSession || !refresh || isPrefetch) {
    return NextResponse.next();
  }
  if (access && !isExpiredJwt(access)) {
    return NextResponse.next();
  }

  let fresh: { access?: string; refresh?: string } | null = null;
  let rejected = false;
  try {
    const res = await fetch(`${DJANGO_API_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (res.ok) {
      fresh = await res.json();
    } else {
      rejected = res.status === 400 || res.status === 401;
    }
  } catch {
    fresh = null;
  }

  if (!fresh?.access) {
    if (rejected && isDefinitelyDeadToken(refresh)) return signedOutRedirect(request);
    return NextResponse.next();
  }

  // Bu render'ın taze token'ı görmesi için isteğin Cookie başlığını yeniden
  // yaz (bkz. node_modules/next/dist/docs/.../file-conventions/proxy.md →
  // "Setting Headers": yukarı doğru iletmenin yolu NextResponse.next'in
  // `request.headers` seçeneğidir).
  const cookies = request.cookies;
  cookies.set(ACCESS_COOKIE, fresh.access);
  if (fresh.refresh) cookies.set(REFRESH_COOKIE, fresh.refresh);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    "cookie",
    cookies
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; "),
  );

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(ACCESS_COOKIE, fresh.access, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_MAX_AGE_MINUTES * 60,
  });
  if (fresh.refresh) {
    response.cookies.set(REFRESH_COOKIE, fresh.refresh, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: REFRESH_MAX_AGE_DAYS * 24 * 60 * 60,
    });
  }
  return response;
}

export async function proxy(request: NextRequest) {
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
    return withRefreshedAccessCookie(request);
  }

  // Creator keşfi markalar içindir — giriş yapmış bir creator, /creators'a
  // (liste veya tekil profil) doğrudan URL ile de gitmeye çalışsa kendi
  // panosuna yönlendirilir. Anonim ziyaretçiler ve markalar etkilenmez.
  if (pathname.startsWith("/creators")) {
    const session = readSession(request);
    if (session?.user?.role === "creator") {
      return NextResponse.redirect(new URL("/dashboard/creator", request.url));
    }
    return withRefreshedAccessCookie(request);
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

  return withRefreshedAccessCookie(request);
}

export const config = {
  matcher: ["/dashboard/:path*", "/manage/:path*", "/creators/:path*"],
};
