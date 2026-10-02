# TRUGC — Technical Audit & Handover

Engineering reference for anyone picking up this codebase after this integration pass. For day-to-day setup/deploy commands, see `README.md` — this document is architecture and decision rationale.

## 1. Architecture overview

```
                     ┌──────────────┐
   Browser  ───────▶ │    Caddy     │  (TLS termination, reverse proxy, gzip/zstd)
                     └──────┬───────┘
                   ┌────────┴────────┐
                   │                 │
             /  (everything      /api/v1/*, /admin/*,
              else)              /healthz/*, /static/*, /media/*
                   │                 │
             ┌─────▼─────┐    ┌──────▼──────┐
             │  frontend │    │   backend   │
             │ (Next.js  │───▶│  (Django +  │
             │ standalone)    │   DRF)      │
             └─────┬─────┘    └──┬───┬──────┘
     httpOnly cookies │          │   │
     (access+refresh) │     ┌────▼┐ ┌▼────────┐
     read server-side  │     │  db │ │  redis  │
     via next/headers  │     │(PG) │ │(cache + │
                        │     └─────┘ │ celery  │
                        │              broker)  │
                   (JWT Bearer,        └────┬────┘
                    browser only)      ┌─────▼──────┐┌─────────────┐
                                        │celery_worker││celery_beat │
                                        └─────────────┘└─────────────┘
```

The frontend is **not** a pure static SPA — it's a Next.js server (App Router, `output: "standalone"`) that both renders pages server-side (fetching from Django directly over the Docker network) and hosts a small set of its own API routes (`app/api/auth/*`) that act as a BFF (backend-for-frontend) for anything touching the refresh token.

## 2. Service responsibilities

| Service | Image / build | Responsibility |
|---|---|---|
| `caddy` | `caddy:2-alpine` | Only service with published ports (80/443). TLS (automatic Let's Encrypt via `{$DOMAIN}`), gzip/zstd, routes `/api/v1/*`\|`/admin/*`\|`/healthz/*`\|`/static/*`\|`/media/*` → `backend:8000`, everything else → `frontend:3000`. |
| `frontend` | `./frontend/Dockerfile` (multi-stage, Node 20-alpine, standalone output) | Renders every page (marketing + dashboards), owns `/api/auth/{login,refresh,logout}` as the only code that ever touches the refresh token. |
| `backend` | `./backend/Dockerfile` (Python 3.12-slim, gunicorn) | REST API under `/api/v1/`, Django admin, Swagger/Redoc, media serving in dev. `entrypoint.sh` runs `migrate`, `collectstatic`, `seed_groups` on every boot. |
| `celery_worker` | same image as `backend` | Async tasks: verification/password-reset emails, notification fan-out. |
| `celery_beat` | same image as `backend` | Scheduled tasks via `django-celery-beat`'s DB-backed schedule. |
| `db` | `postgres:16-alpine` | System of record. Named volume `postgres_data`. |
| `redis` | `redis:7-alpine` | DRF cache/throttling backend + Celery broker (db 0 and db 1 respectively). Cache failures are swallowed (`IGNORE_EXCEPTIONS`) — the API degrades (no throttling) rather than 500s if Redis is down. |

## 3. Docker networking & ports

- Single bridge network (`internal`) — every service resolves the others by service name (`db`, `redis`, `backend`, `frontend`).
- **Only `caddy` publishes host ports** (80, 443). `backend` and `frontend` use `expose` only — unreachable from the host directly, only from other containers. This is deliberate: it forces all traffic through Caddy's TLS/header hardening even in local dev.
- Two distinct "API base URLs" exist in the frontend and this is the single most common source of confusion when extending this app:
  - `NEXT_PUBLIC_API_BASE_URL` (`/api/v1`, relative) — used by **client-side** (browser) `fetch` calls, resolved against the page's own origin, which Caddy then proxies to `backend:8000`.
  - `DJANGO_API_URL` (`http://backend:8000/api/v1`, absolute) — used by **server-side** code (Server Components, the `app/api/auth/*` route handlers) via `frontend/lib/api.ts`'s `isServer` branch. Node's `fetch` has no browser origin to resolve a relative URL against, so server-side calls must be absolute, and they bypass Caddy entirely (straight to `backend:8000` over the Docker network) since there's no benefit to bouncing through the reverse proxy for an internal call.

## 4. Environment variables

See `README.md`'s Environment Variables table for the full reference; the load-bearing ones to understand structurally:

- **`.env`** is the single source of truth for local dev, passed to `frontend`, `backend`, `celery_worker`, `celery_beat` via `env_file: .env` in `docker-compose.yml`, and also used by Compose itself for `${VAR}` interpolation (Postgres image env vars, Caddy's `{$DOMAIN}`).
- `NEXT_PUBLIC_*` variables are **baked into the client JS bundle at build time** (standard Next.js behavior) — changing them requires `docker compose build frontend` again, not just a container restart. Every other variable is read at container **runtime**.
- `ACCESS_TOKEN_LIFETIME_MINUTES`/`REFRESH_TOKEN_LIFETIME_DAYS` are read by **both** Django (`SIMPLE_JWT` settings) and the frontend's `app/api/auth/*` route handlers (cookie `maxAge`) — keep them in the same `.env` file so they can't drift.

## 5. Authentication design (why it's shaped this way)

Three credentials, three lifetimes, three storage locations:

| Credential | Lifetime | Storage | Who reads it |
|---|---|---|---|
| Access token (browser copy) | `ACCESS_TOKEN_LIFETIME_MINUTES` (default 30m) | JS memory (`lib/token-store.ts`) | Client-side `fetch` calls (`Authorization: Bearer`) |
| Access token (server copy) | same | httpOnly cookie `trugc_access` | `lib/api.ts`'s server branch, via `next/headers` |
| Refresh token | `REFRESH_TOKEN_LIFETIME_DAYS` (default 7d) | httpOnly cookie `trugc_refresh` | Only `app/api/auth/{login,refresh,logout}/route.ts` |

Why two copies of the access token: Server Components render before any client JS executes, so they physically cannot reach a JS-memory value. The alternative (proxy every single domain API call through a Next route handler just to attach a token server-side) was rejected as unnecessary indirection — a short-lived httpOnly cookie readable only by `next/headers` (never `document.cookie`) gets the same XSS-resistance property at far less complexity.

The refresh token is **never** sent to the client in a JSON body or a JS-readable cookie — only `app/api/auth/*` ever sees it, and SimpleJWT is configured with `ROTATE_REFRESH_TOKENS` + `BLACKLIST_AFTER_ROTATION`, so a stolen refresh token is single-use.

`frontend/proxy.ts` (this Next.js major version renamed `middleware.ts` → `proxy.ts` — see version history in `node_modules/next/dist/docs/.../file-conventions/proxy.md`) gates `/dashboard/*` on a **separate**, non-sensitive, client-readable cookie (`trugc_session`, user info only) purely to avoid a redirect flash for obviously-signed-out visitors. It is not a security boundary — Django rejects any request without a valid, correctly-scoped token regardless of what this proxy does.

## 6. Deployment sequence (VPS)

1. DNS `A` record → VPS IP.
2. `git clone`, `cp .env.production.example .env`, fill every placeholder.
3. `./scripts/deploy.sh`: `git pull --ff-only` → `docker compose build` → `docker compose up -d` → poll for backend healthy → `docker image prune -f`.
4. First boot: `entrypoint.sh` inside `backend` runs migrations + `seed_groups` automatically. Categories are seeded via a **data migration** (`apps/creators/migrations/0003_seed_categories.py`), also automatic.
5. Caddy requests a Let's Encrypt cert for `$DOMAIN` on first incoming HTTPS request — no manual certbot step.
6. Create the first admin: `docker compose exec backend python manage.py createsuperuser`.

Changing domains later: edit `DOMAIN` in `.env`, `docker compose up -d caddy` (Caddy re-requests a cert for the new domain automatically).

## 7. Production checklist

- [ ] `.env` has a real `DJANGO_SECRET_KEY` (not the dev placeholder — `config.settings.prod` raises `RuntimeError` at import time if left as `insecure-dev-key-change-me` or if `DJANGO_ALLOWED_HOSTS` is empty).
- [ ] `POSTGRES_PASSWORD` changed from the dev default.
- [ ] `DOMAIN`, `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `FRONTEND_URL` all point at the real domain.
- [ ] `SECURE_SSL_REDIRECT=True`, `SESSION_COOKIE_SECURE=True`, `CSRF_COOKIE_SECURE=True`, `SECURE_HSTS_SECONDS=31536000` (all default `True`/set in `.env.production.example` — just confirm they weren't copy-pasted from `.env.example`).
- [ ] Real SMTP creds (`EMAIL_*`) — without them, verification/password-reset emails silently go to the console log inside the container instead of a real inbox.
- [ ] Run `docker compose exec backend python manage.py check --deploy` and address anything it flags beyond what's already handled above.
- [ ] `docker compose ps` shows all 7 services `healthy` before considering the deploy complete.
- [ ] `./scripts/healthcheck.sh` passes.

## 7b. Ücretlendirme, zorunlu kullanıcı akışı ve sanal POS (bu geçişte eklendi)

### Merkezi ücretlendirme kontrolü

Tek kaynak: `backend/apps/common/pricing.py`. Diğer her şey (izin sınıfları, serializer'lar, genel `/payments/pricing/` ucu, frontend provider'ı) bu modülü okur. Buradaki tasarım kararları:

- **Gün hesabı yalnızca sunucuda.** `timezone.now()` + `BILLING_TIMEZONE` (varsayılan `Europe/Istanbul`). İstemciden gelen hiçbir tarih/saat bilgisi ücretlendirme kararına girmez. Django'nun `TIME_ZONE`'u UTC olduğu için saat dilimi dönüşümü şarttır: Cumartesi 02:00 (TR) UTC'de hâlâ Cuma'dır ve bu ayrım olmadan hafta sonunun ilk üç saatinde ücret istenirdi (`apps/common/tests.py::test_day_boundary_uses_billing_timezone_not_utc` bu regresyonu kilitler).
- **Hiçbir değer modül düzeyinde cache'lenmez**; her çağrı ayarları yeniden okur. Böylece `override_settings` ile test edilebilir ve ayar değişikliği process restart gerektirmez.
- **Fiyat gizleme serializer katmanındadır** (`apps/common/serializers.py::FreePeriodPricingMixin`), view katmanında değil: verinin uygulamadan çıktığı tek nokta orasıdır, dolayısıyla curl/mobil istemci de aynı davranışı görür. Tek istisna staff/moderatör/admin'dir — `/manage` raporlama ekranları hafta sonu kör kalmamalı.
- **Ödeme engeli ayrı bir izin sınıfıdır** (`PaymentsEnabled`), gizlemeden bağımsız. "Fiyatı gizle" ile "ücreti tahsil etme" aynı modülden beslenir ama farklı mekanizmalardır; biri atlansa diğeri hâlâ tutar.
- **Callback'ler ücretsiz dönemde de çalışır.** Hafta içi başlatılmış bir ödemenin banka bildirimi hafta sonuna sarkabilir; parası çekilmiş bir işlemi "hafta sonu ücretsiz" diye reddetmek kullanıcıyı mağdur ederdi. Kapalı olan ödeme *başlatma*dır.

### Zorunlu kullanıcı akışı

`IsOnboarded` (`apps/accounts/permissions.py`) e-posta doğrulaması ve profil fotoğrafını birlikte kontrol eder. `IsEmailVerified & HasProfilePhoto` kombinasyonu yerine tek sınıf olmasının nedeni hata mesajıdır: DRF yalnızca başarısız olan ilk iznin mesajını döndürür; bu sınıf eksik adımı tespit edip ona özel kod/mesaj üretir (`EMAIL_NOT_VERIFIED` / `PROFILE_PHOTO_REQUIRED`).

Bunun çalışması için `apps/accounts/exceptions.py`'de küçük ama önemli bir değişiklik yapıldı: hata zarfı, 403'lerin mesajını her zaman genel "Bu işlemi gerçekleştirme yetkiniz bulunmuyor." metniyle değiştiriyordu — yani izin sınıflarının özenle yazılmış Türkçe `message` alanları istemciye hiç ulaşmıyordu. Artık yalnızca açıkça son kullanıcı için yazılmış kodlar (`USER_FACING_CODES`) aynen geçiriliyor; diğer her şey eskisi gibi genel metne indirgeniyor. Bir izin sınıfı bu listeye `code = "..."` alanı koyarak katılır (DRF bu değeri `PermissionDenied` içindeki `ErrorDetail.code` alanına taşır).

Frontend tarafındaki `/onboarding` yönlendirmesi ve panel layout kontrolleri **güvenlik sınırı değildir**; yalnızca kullanıcıyı doğru ekrana götürür. Durum okunamazsa (ör. bayat access cookie'si) akış tamamlanmış sayılır — mevcut bir kullanıcıyı ağ hatası yüzünden kurulum ekranına kilitlemek kabul edilemez; gerçek engel her endpoint'te zaten uygulanır.

### Profil fotoğrafı

Zorunluluk **kullanıcı başına** karara bağlıdır (`User.profile_photo_required`, bkz. `User.photo_is_required`): kural getirildiğinde var olan tüm satırlar bir veri taşıma adımıyla muaf tutuldu (`accounts/migrations/0008`), sonrasında açılan her hesap alanın `True` varsayılanını alır. Tarih eşiğine dayalı bir alternatif (ör. "şu tarihten sonra kaydolanlar") bilinçli olarak seçilmedi: kayan bir eşik, sunucu saati veya ayar değişikliğiyle birlikte geçmişe dönük olarak davranış değiştirir, kullanıcı başına bayrak ise ne olduğunu satırın kendisinde taşır ve tek bir hesap için admin panelinden geri alınabilir.

"Kullanıcı başına 1 adet" kuralı iki seviyede uygulanır: şema düzeyinde `Profile` ↔ `User` OneToOne ve tek `avatar` alanı (birden fazla fotoğraf durumu imkânsız), depolama düzeyinde ise serializer yeni dosyayı yazdıktan sonra eskisini siler — Django bunu kendiliğinden yapmaz ve her yükleme diskte yetim dosya bırakırdı.

Doğrulama uzantı + boyut + **içerik** kontrolünü birlikte yapar (`apps/common/validators.py::validate_avatar_image`): dosya Pillow ile açılır, formatı beyaz listeye karşı kontrol edilir, çözünürlük 100–6000px aralığında olmalıdır (çok büyük görsellerle "decompression bomb" riskini sınırlar). Uzantı ve `Content-Type` istemci tarafından belirlendiği için tek başına güvenilmez.

Dikkat: `ProfilePhotoSerializer`'da `avatar` alanı açıkça tanımlı olduğu için model validator'ları otomatik kopyalanmaz; doğrulayıcılar elle bağlanmıştır. Bu alan tanımı değiştirilirse doğrulayıcıların da taşındığından emin olun (aksi halde yalnızca DRF'nin genel "bu bir görsel mi" kontrolü kalır).

### Sanal POS

`backend/apps/payments/pos/` — soyut `PosProvider` arayüzü + `iyzico`, `paytr` ve harici çağrı yapmayan `sandbox` uygulamaları.

- **PCI kapsamı bilinçli olarak dışarıda tutuldu:** yalnızca sağlayıcının barındırdığı 3D Secure sayfasına yönlendirme (hosted checkout) modeli kullanılır; kart numarası/CVV uygulamaya hiç girmez ve `payments_pos_payment` tablosunda kart verisi tutulmaz.
- **Harici HTTP çağrıları stdlib `urllib` ile** yapılır, zaman aşımına tabidir. `requests` eklenmedi — imaja yeni bir Python bağımlılığı getirmemek için.
- **Bildirim doğrulaması sağlayıcıya göre değişir:** PayTR'de HMAC-SHA256 imzası (`hash`) doğrulanır, iyzico'da token ile sağlayıcıya sunucudan tekrar sorulur. İkisinde de tutar karşılaştırılır ve başarı yan etkileri idempotenttir (`select_for_update` + "zaten PAID ise dokunma"), çünkü sağlayıcılar aynı bildirimi tekrar gönderebilir.
- **Yapılandırma eksikse sessizce başarılı sayan hiçbir yol yok:** `POS_PROVIDER` boşsa veya kimlik bilgileri eksikse `503 POS_NOT_CONFIGURED` döner ve eksik ayar adları (yalnızca staff'a) listelenir. `sandbox` sağlayıcısı `DEBUG=False` ortamda `POS_SANDBOX_ALLOW_IN_PROD` açıkça verilmedikçe çalışmayı reddeder.
- Erişim paketi tutarı **istemciden alınmaz**, sunucudaki `BRAND_ACCESS_PRICE`'tan okunur (`test_client_cannot_dictate_the_access_package_price`).
- `Brand.paid_access_until` eklendi: `NULL` = süresiz (admin tarafından manuel açılan hesaplarla geriye dönük uyumlu), dolu = bitiş tarihi. POS ödemesi erişimi mevcut bitiş tarihinden uzatır.

## 8. Known limitations (accepted for this scope, not oversights)

- **Marketplace "premium" fields with no backend model**: creator `rating`/`reviewCount`/`tier`/`startingPrice`/pricing `packages`/`responseTime`, portfolio like/view counts. These are UI-only in the original design and were never backed by data — the frontend hides them gracefully (optional fields, conditional rendering) rather than fabricating numbers. Building them out is a real feature-design task (rating aggregation strategy, tier calculation rules, a pricing-package data model), not a wiring fix.
- **No admin "reports/moderation" system existed before this pass** — now added (`apps/reports/`), deliberately minimal: a flat `(reporter, target_type, target_id, reason, status)` model, no generic-relation traversal, no target-type-specific validation. Fine for an MVP intake queue; would need hardening (rate limiting per reporter, target existence validation, abuse-prevention) before high volume.
- **Message attachments have no access control beyond obscurity** — served through the same public `/media/*` path as every other upload in the app (avatars, campaign media, portfolio). Anyone with the URL can fetch a file; there's no per-conversation authorization check on the media-serving path itself. Consistent with how the rest of the app already handles uploads, but worth knowing before treating conversation attachments as private.
- **No WebSockets** — messaging is REST-only, polled client-side (conversations every 15s, active conversation's messages every 5s, notifications every 30s). `config/asgi.py` is plain `get_asgi_application()`, no Django Channels. Real-time messaging would need Channels + a channel layer (Redis pub/sub is already available for this) added as a new subsystem, not a small change.
- **Creator payout/bank-account management still does not exist.** Marka tarafı artık gerçek bir sanal POS akışına bağlı (bkz. §7b), ancak creator'a para çıkışı (IBAN toplama, toplu ödeme dosyası, mutabakat) hiç modellenmedi — `Kazançlar` ekranındaki "Para çek" butonu hâlâ hiçbir şeye bağlı değildir.
- **Platform komisyonu yapılandırılabilir ama tahsil edilmiyor.** `PLATFORM_COMMISSION_PERCENT` ücretlendirme durumunda raporlanır; emanet tutarından komisyon kesen bir muhasebe akışı (ayrı `Transaction` satırı/ledger) bu geçişin kapsamında değildi.
- **Registration is a multi-call client-side orchestration** (`register` → `login` → `PATCH` profile → `PATCH` creator/brand), not a single atomic backend transaction. If a later step fails (e.g. network drop after account creation but before profile completion), the user ends up with a registered-but-incomplete account. Low likelihood, no current retry/resume UX for it.
- **Static generation is fully disabled** (`export const dynamic = "force-dynamic"` app-wide) rather than selectively applied per-route. Simpler and correct for a backend this data-driven, but it does mean even genuinely cacheable public marketing pages (e.g. `/hakkimizda`) are server-rendered on every request instead of served from a static/ISR cache. Revisit if TTFB on high-traffic static-ish pages becomes a concern.

## 9. Future roadmap (not built, explicitly out of scope this pass)

- Real-time messaging (Django Channels + Redis pub/sub).
- Creator pricing packages as an actual backend model (currently local-only UI state, not persisted).
- Admin user-management actions beyond listing (suspend/activate, role changes) — `GET /api/v1/auth/users/` exists (list only) but no corresponding mutate endpoints.
- Payments/billing integration (the `payments` app models escrow-style transactions already; there's no Stripe/provider integration wired to it).
- S3 media storage in production (`USE_S3` flag and `django-storages` config already exist — just needs credentials and a bucket).
- Rate-limiting/abuse controls on the reports queue.
