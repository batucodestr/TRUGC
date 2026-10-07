# TRUGC

An influencer marketplace connecting brands and creators — Next.js 15 frontend, Django 5 + DRF backend, PostgreSQL, Redis, JWT auth, all behind Caddy.

```
UGC/
├── frontend/            Next.js 15 + TypeScript + Tailwind + shadcn/ui
├── backend/              Django 5 + DRF + SimpleJWT + Celery
├── docker-compose.yml    frontend, backend, celery worker/beat, db, redis, caddy
├── Caddyfile             reverse proxy: / → frontend, /api|/admin|/static|/media → backend
├── .env.example           local dev environment template
├── .env.production.example  VPS deployment environment template
├── scripts/              deploy.sh, backup.sh, healthcheck.sh
├── docs/
└── TECHNICAL_AUDIT.md    architecture/handover reference for engineers picking this up
```

## Local development — Docker (recommended)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost
- API: http://localhost/api/v1/
- Swagger docs: http://localhost/api/v1/docs/ · Redoc: http://localhost/api/v1/redoc/
- Django admin: http://localhost/admin/
- Health check: http://localhost/healthz/

The backend's `entrypoint.sh` runs migrations, `collectstatic`, and `seed_groups` automatically on container start — no manual setup needed. Create an admin user with:

```bash
docker compose exec backend python manage.py createsuperuser
```

## Local development — manual (no Docker)

**Backend** (needs Python 3.12+, Postgres, optionally Redis):

```bash
cd backend
python -m venv .venv && source .venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt
cp ../.env.example .env   # edit DATABASE_URL / REDIS_URL for your local setup, or unset both to use localhost defaults
python manage.py migrate
python manage.py seed_groups
python manage.py createsuperuser
python manage.py runserver
```

Redis is used for caching and DRF throttling only — cache failures are swallowed (`IGNORE_EXCEPTIONS`), so the API keeps working without it. Celery (notification emails, scheduled jobs) is optional for local API work: `celery -A config worker -l info`.

Tests run against in-memory SQLite, no Postgres/Redis required:

```bash
cd backend && pytest
```

**Frontend** (needs Node 22+):

```bash
cd frontend
npm install
# .env.local:
#   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
#   DJANGO_API_URL=http://localhost:8000/api/v1
npm run dev
```

The frontend always talks to the real backend — there is no mock/demo data mode. If `backend` isn't running, pages that need it will show their error state (see "Error handling" below) rather than silently falling back to fake data.

## Environment variables

All variables live in one root `.env` (Docker) or are split across `backend/.env` + `frontend/.env.local` (manual dev). See `.env.example` for local defaults and `.env.production.example` for the production template with every value that must be replaced.

| Variable | Purpose |
|---|---|
| `DOMAIN` | The one line to change when deploying to a new domain — Caddy reads it via `{$DOMAIN}`. |
| `DJANGO_SECRET_KEY` | Django's cryptographic secret. Must be replaced with a long random value in production. |
| `DJANGO_DEBUG` | `True` locally, `False` in production (enforced — `config.settings.prod` raises at import time if left insecure). |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated hosts Django will serve. |
| `DJANGO_SETTINGS_MODULE` | `config.settings.dev` / `config.settings.test` / `config.settings.prod`. |
| `POSTGRES_*`, `DATABASE_URL` | Postgres connection, consumed by both the `db` container and Django (`dj-database-url`). |
| `REDIS_URL`, `CELERY_BROKER_URL` | Redis for caching/throttling and the Celery broker. |
| `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `FRONTEND_URL` | Must include every origin the frontend is served from. |
| `ACCESS_TOKEN_LIFETIME_MINUTES`, `REFRESH_TOKEN_LIFETIME_DAYS` | JWT lifetimes (SimpleJWT). |
| `SECURE_SSL_REDIRECT`, `USE_X_FORWARDED_HOST`, `SECURE_PROXY_SSL_HEADER`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_HSTS_SECONDS` | Security headers/cookies — permissive in `.env.example` (plain HTTP dev), locked down in `.env.production.example` (HTTPS enforced, HSTS on, secure cookies). |
| `RESEND_API_KEY` | Resend API key (`re_…`) — the primary mail provider, used for verification/password-reset/notification emails. Set it and `EMAIL_BACKEND` switches to Resend automatically. |
| `RESEND_API_URL`, `RESEND_TIMEOUT_SECONDS`, `RESEND_MAX_RETRIES` | Resend endpoint, per-request timeout (default 8s) and extra attempts on 429/5xx/network errors (default 1). |
| `DEFAULT_FROM_EMAIL` | Sender address. **Must** be on a domain verified in Resend, otherwise the API rejects it with 403. |
| `EMAIL_*` (`EMAIL_HOST`, …) | SMTP fallback, used only when `RESEND_API_KEY` is empty. With neither configured, Django's console backend prints the mail to the container log and nothing is actually sent. |
| `EMAIL_VERIFICATION_TIMEOUT_SECONDS` | Doğrulama bağlantısının geçerlilik süresi (varsayılan 86400 = 24 saat). |
| `ONBOARDING_REQUIRE_EMAIL_VERIFICATION`, `ONBOARDING_REQUIRE_PROFILE_PHOTO` | Zorunlu kullanıcı akışının adımlarını platform genelinde açar/kapatır. Varsayılan `True`. Fotoğraf kuralı ayrıca kullanıcı başına `User.profile_photo_required` bayrağına tabidir: kural getirilmeden önce var olan hesaplar muaftır. |
| `BILLING_TIMEZONE` | Ücretsiz/ücretli gün hesabının yapıldığı saat dilimi (varsayılan `Europe/Istanbul`). Django'nun `TIME_ZONE`'u UTC olduğu için bu ayrım şarttır. |
| `BILLING_FREE_WEEKDAYS` | Ücretsiz günler, `weekday()` indeksiyle (Pazartesi=0 … Pazar=6). Varsayılan `5,6` = Cumartesi + Pazar. |
| `BILLING_FREE_PERIOD_ENABLED` | Hafta sonu ücretsiz kullanımın ana anahtarı. `False` → her gün ücretlendirme aktif. |
| `BILLING_CURRENCY`, `PLATFORM_COMMISSION_PERCENT` | Para birimi ve hafta içi komisyon oranı (ücretsiz dönemde komisyon 0). |
| `BRAND_ACCESS_PRICE`, `BRAND_ACCESS_DAYS` | Markanın creator dizini erişim paketinin fiyatı ve süresi. Fiyat `0` ise sanal POS ile satın alma kapalıdır (erişim yalnızca admin panelinden açılır). |
| `POS_PROVIDER` | Sanal POS sağlayıcısı: boş (kapalı) \| `iyzico` \| `paytr` \| `sandbox`. Boşken ödeme başlatma ucu `503 POS_NOT_CONFIGURED` döner. |
| `POS_RETURN_URL` | Ödeme sonrası kullanıcının döndüğü frontend sayfası (`/payment/return`). |
| `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL` | iyzico kimlik bilgileri (sandbox/canlı URL dahil). |
| `PAYTR_MERCHANT_ID`, `PAYTR_MERCHANT_KEY`, `PAYTR_MERCHANT_SALT`, `PAYTR_TEST_MODE` | PayTR kimlik bilgileri. |
| `POS_SANDBOX_ALLOW_IN_PROD` | Harici çağrı yapmayan test sağlayıcısının production'da çalışmasına izin verir. Canlıda `False` kalmalıdır. |
| `USE_S3`, `AWS_*` | Flip `USE_S3=True` and fill in the AWS_* values to move media off the VPS filesystem onto S3 — no code changes needed, the storage backend already switches on this flag. |
| `NEXT_PUBLIC_API_BASE_URL` | Client-side API base. `/api/v1` (relative, same-origin through Caddy) in both dev-via-Docker and production. |
| `DJANGO_API_URL` | Server-side only (Next.js route handlers) — talks to Django directly over the Docker network, bypassing Caddy. |

## Authentication

JWT via `djangorestframework-simplejwt`, with rotation + blacklisting enabled. The frontend never stores the refresh token in JS-reachable storage:

- **Access token (browser)**: kept in memory only (`frontend/lib/token-store.ts`) — attached as `Authorization: Bearer <token>` on every client-side API call, lost on page reload by design.
- **Access token (server)**: Server Components render before any client JS runs, so they can't reach the in-memory copy. Login/refresh also set the access token as a second, short-lived httpOnly cookie (`trugc_access`) purely for `lib/api.ts` to read server-side via `next/headers` when rendering authenticated pages (dashboards, "my campaigns", etc.).
- **Refresh token**: a long-lived httpOnly cookie (`trugc_refresh`), set/rotated/cleared only by the Next.js route handlers under `frontend/app/api/auth/{login,refresh,logout}/route.ts`, which are the only code that ever sees it.
- On page load, `restoreSession()` silently exchanges the refresh cookie for a new access token. On any `401` from a client-side API call, `lib/api.ts` does the same exchange once and retries the original request before giving up.
- `frontend/proxy.ts` (this Next.js version renamed `middleware.ts` → `proxy.ts`; the function must be named `proxy`, not `middleware`, or the build fails) gates `/dashboard/*` at the edge based on the presence of a lightweight, non-sensitive session cookie (user info only, no tokens) — real authorization always happens on the Django side regardless of what the proxy does.
- All backend-driven pages are rendered dynamically (`export const dynamic = "force-dynamic"` in the root layout) rather than statically generated — the data is live/per-user, and this also means `docker build` never needs network access to a running backend, only the running container does at request time.

Endpoints: register (`POST /api/v1/auth/register/`), login (`POST /api/v1/auth/login/`), refresh (`POST /api/v1/auth/token/refresh/`), logout/blacklist (`POST /api/v1/auth/logout/`), password reset request/confirm, email verification/resend — all under `/api/v1/auth/`. Full interactive reference at `/api/v1/docs/` (Swagger) or `/api/v1/redoc/`.

Roles are `creator` / `brand` / `moderator` / `admin` (`backend/apps/accounts/models.py::Role`). Only `creator`/`brand` can self-register; `moderator`/`admin` are created via `createsuperuser` or the Django admin. A `Creator`/`Brand` profile row is auto-created via a `post_save` signal the moment a user registers with that role.

## Reports & moderation

A minimal moderation queue (`backend/apps/reports/`): any authenticated user can file a report against a creator/brand profile or a campaign (`POST /api/v1/reports/` — `{target_type, target_id, reason}`); only moderators/admins can list the queue or resolve one (`POST /api/v1/reports/{id}/resolve/` — `{status: "resolved"|"dismissed", notes?}`). Frontend: `components/shared/report-dialog.tsx` (the "Bildir" button on creator profiles and campaign pages) and the moderator queue at `/dashboard/admin/reports`. There's deliberately no target-type-specific validation or generic-relation lookup — it's an MVP intake + review queue, not a full trust-and-safety system.

## Message attachments

A message can carry one image or PDF attachment (≤10MB — `backend/apps/common/validators.py::MESSAGE_ATTACHMENT_EXTENSIONS`/`MAX_MESSAGE_ATTACHMENT_SIZE_BYTES`), sent as a single multipart `POST` to the same conversation-messages endpoint (`body` + `attachment` fields). Files are stored under `media/message_attachments/%Y/%m/` and served back through the same `/media/*` path as every other upload (avatars, campaign media, etc.) — there's no per-file access control beyond knowing the URL, matching how the rest of the app's media already works; don't attach anything to a conversation that needs to stay private beyond "not linked from anywhere public."

## E-posta gönderimi (Resend)

Tüm giden e-postalar (doğrulama, şifre sıfırlama, bildirim) Django'nun standart
`send_mail` arayüzünden geçer; `EMAIL_BACKEND` seçimi `config/settings/base.py`
içinde `apps.common.email.select_email_backend()` ile yapılır:

```
EMAIL_BACKEND (açıkça verilmişse)  →  RESEND_API_KEY  →  EMAIL_HOST (SMTP)  →  console
```

Birincil sağlayıcı **Resend**'dir: `apps/common/email.py::ResendEmailBackend`,
`POST https://api.resend.com/emails` ucuna gider. SMTP yerine HTTP seçilmesinin
nedeni, VPS'lerin giden 25/465/587 portlarını sık sık kapatması ve SMTP
bağlantısının o durumda sessizce zaman aşımına düşmesidir — Resend 443 üzerinden
çalıştığı için ek bir ağ izni gerektirmez. Yeni bir bağımlılık eklenmez; tek POST
isteği için stdlib `urllib.request` kullanılır.

Backend `send_mail`'in tüm yeteneklerini destekler: düz metin + HTML
(`html_message` / `EmailMultiAlternatives`), cc, bcc, reply-to, ek dosyalar
(base64) ve ekstra başlıklar. Geçici hatalar (429/5xx/ağ) `RESEND_MAX_RETRIES`
kadar tekrar denenir; 4xx tekrar denenmez.

> **Dikkat — `RESEND_USER_AGENT` kaldırılamaz.** `api.resend.com` Cloudflare
> arkasındadır ve stdlib'in varsayılan `Python-urllib/3.x` imzasını bot sayıp
> **Error 1010 / `browser_signature_banned`** ile 403 döner. Bu durumda hata
> mesajı Resend'den değil Cloudflare'den gelir ve "doğrulanmamış alan adı" 403'üne
> çok benzer; ikisini ayırmak için log'daki gövdeye bakın (`cloudflare_error:true`
> var mı?). `apps/common/test_email.py::test_request_sends_a_non_urllib_user_agent`
> bu başlığın düşmesini engeller.

**Kurulum:**

1. [resend.com](https://resend.com) → **Domains** → alan adını (`trugc.com.tr`) ekle,
   panelin verdiği SPF/DKIM DNS kayıtlarını yayınla, durum `Verified` olana kadar bekle.
2. **API Keys** → *Create API Key* (yalnızca *Sending access* yeterli). Anahtar `re_` ile başlar.
3. `.env`: `RESEND_API_KEY=re_…` ve `DEFAULT_FROM_EMAIL=noreply@trugc.com.tr`
   (gönderen adresi **doğrulanmış alan adında olmak zorunda**, aksi halde Resend 403 döner).
4. `docker compose up -d --build backend celery_worker celery_beat`
5. Doğrula: `docker compose exec backend python manage.py send_test_email ben@ornegim.com`

> Alan adı doğrulanmadan Resend yalnızca kendi hesap adresinize gönderim yapar ve
> ücretsiz plan günlük 100 / aylık 3.000 e-posta ile sınırlıdır. Kayıt hacmi bunu
> aşarsa plan yükseltilmelidir.

**Teşhis:** `manage.py check` (her container başlangıcında entrypoint üzerinden
çalışır) yapılandırma hatalarını açıkça söyler: `accounts.W001` hiç sağlayıcı yok,
`W002` gönderen alan adı doğrulanamaz (gmail.com vb.), `W003` anahtar biçimi
yanlış, `W004` anahtar dolu ama backend console'da. Uygulama akışı gönderimi
`fail_silently=True` ile çağırdığı için sağlayıcı hataları kullanıcıya
görünmez — her başarısız gönderim ERROR olarak loglanır:
`docker compose logs backend | grep -i resend`.

## Zorunlu kullanıcı akışı (e-posta doğrulama + profil fotoğrafı)

Yeni bir hesabın ana özellikleri kullanabilmesi için iki adımı tamamlaması gerekir:

```
Kayıt → E-posta doğrulama → Profil fotoğrafı → Uygulamayı kullanma
```

- **Kayıt** (`POST /api/v1/auth/register/`) sonrasında doğrulama e-postası otomatik gönderilir. Bağlantı `${FRONTEND_URL}/verify-email?uid=…&token=…` adresine gider; token Django'nun HMAC şemasıyla üretilir, veritabanında saklanmaz, `EMAIL_VERIFICATION_TIMEOUT_SECONDS` sonunda geçersiz olur ve doğrulama tamamlandığı an tekrar kullanılamaz (imza `email_verified` alanını içerir). Yeni bağlantı: `POST /api/v1/auth/email/resend/` (`auth` throttle kapsamında, 10/dk).
- **Profil fotoğrafı zorunluluğu yalnızca yeni hesaplar için geçerlidir.** Kural devreye girdiğinde var olan tüm kullanıcılar muaf tutuldu (`accounts/migrations/0008`, `User.profile_photo_required=False`); bu noktadan sonra açılan her hesap alanın `True` varsayılanını alır. Tek bir kullanıcıyı Django admin'den (`Onboarding` bölümü) muaf tutabilir veya zorunlu kılabilirsiniz; `ONBOARDING_REQUIRE_PROFILE_PHOTO=False` ise kuralı platform genelinde kapatır. Karar tarih karşılaştırmasına değil, kullanıcı başına açık bir bayrağa dayanır.
- **Profil fotoğrafı** `POST /api/v1/auth/me/photo/` (veya `PATCH /auth/me/profile/`) ile yüklenir. Kullanıcı başına tek fotoğraf tutulur: `Profile` satırı `User` ile OneToOne'dur ve yeni yükleme eski dosyayı depolamadan da siler. Doğrulama hem frontend'de (tip/boyut ön kontrolü) hem backend'de yapılır: izinli uzantılar `jpg/jpeg/png/webp`, en fazla 5MB, dosya Pillow ile açılıp gerçekten görsel olduğu ve 100–6000px arasında olduğu doğrulanır (uzantı/MIME tek başına güvenilmez).
- **Durum** `GET /api/v1/auth/me/onboarding/` ile okunur (`{email_verified, has_profile_photo, complete, next_step}`); login yanıtı ve `/auth/me/` de aynı bilgiyi taşır. Frontend `/onboarding` ekranında eksik adımı gösterir ve marka/creator panelleri akış tamamlanmadan açılmaz.
- **Gerçek engel backend'dedir** (`apps/accounts/permissions.py::IsOnboarded`): kampanya oluşturma/düzenleme, başvuru gönderme, başvuru kabul/red, görüşme başlatma ve tüm ödeme uçları akış tamamlanmadan `403` döner (`EMAIL_NOT_VERIFIED` / `PROFILE_PHOTO_REQUIRED`). Okuma uçları kısıtlanmaz. Staff/moderatör/admin hesapları muaftır.

> Mevcut hesaplar etkilenmez: `email_verified` alanı zaten dolu olan kullanıcılar e-posta adımını geçmiş sayılır ve fotoğraf zorunluluğu onlar için hiç açılmaz. Zorunluluk yalnızca yeni kayıtlarda devreye girer.

> **Doğrulanmamış kullanıcının giriş yapabilmesi bilinçlidir — kapatmayın.** `POST /auth/login/`
> doğrulamadan önce de `200` döner; kullanıcı girince yalnızca `/onboarding` ekranını görür,
> panel ve tüm yazma uçları `403` ile kapalıdır (`IsOnboarded`). Girişin açık kalmasının nedeni
> "maili yeniden gönder" ucunun (`POST /auth/email/resend/`) `IsAuthenticated` istemesidir:
> giriş kapatılırsa, doğrulama e-postası eline ulaşmayan kullanıcı (spam klasörü, yanlış yazılmış
> adres) yeni bağlantı isteyemez ve kalıcı olarak kilitlenir. Girişi gerçekten kapatmak isterseniz
> önce kimlik doğrulaması gerektirmeyen, sıkı rate-limit'li bir yeniden-gönderme ucu eklenmelidir.
> (2026-10-03'te gözden geçirildi ve bu haliyle bırakılmasına karar verildi.)

## Hafta sonu ücretsiz / hafta içi ücretli

Tek bir merkezden yönetilir: `backend/apps/common/pricing.py`.

| Gün | Durum |
|---|---|
| Cumartesi, Pazar | Ücretsiz — hiçbir ücret alınmaz, fiyat alanları gösterilmez |
| Pazartesi – Cuma | Ücretlendirme aktif, sanal POS kullanılabilir |

- **Gün hesabı yalnızca sunucuda** yapılır (`timezone.now()` + `BILLING_TIMEZONE`). Kullanıcının cihaz saati hiçbir yerde kullanılmaz; frontend durumu `GET /api/v1/payments/pricing/` (herkese açık) ucundan okur ve yalnızca gösterir. Takvim gününün `Europe/Istanbul`'a göre değerlendirilmesi şarttır: aksi halde Cumartesi 02:00 (TR) UTC'de hâlâ Cuma olduğu için kullanıcıdan ücret istenirdi.
- **Ücretsiz dönemde backend tarafında neler olur:**
  - Kampanya bütçesi zorunlu değildir, istemciden gelen tutar yok sayılır ve `0` kaydedilir; API yanıtında `budget_min`/`budget_max` `null` döner.
  - Başvurudaki `proposed_rate` yok sayılır ve yanıtlarda gizlenir.
  - Creator paket fiyatları yanıtlarda gizlenir, fiyatsız paket oluşturulabilir.
  - Markanın creator dizinine erişimi için ödeme koşulu (`Brand.has_paid_access`) devre dışıdır — erişim ücretsizdir, ödeme kaydına dokunulmaz.
  - Emanet oluşturma/serbest bırakma ve sanal POS ödeme başlatma uçları `403 FREE_PERIOD` döner.
  - Fiyat gizlemenin tek istisnası staff/moderatör/admin istekleridir; `/manage` raporlama ekranları hafta sonu da gerçek tutarları görür.
- **Sağlayıcı bildirimleri (callback) ücretsiz dönemde de çalışır:** hafta içi başlatılmış bir ödemenin bildirimi hafta sonuna sarkabilir, parası çekilmiş bir işlem reddedilmez. Kapalı olan, ödeme *başlatma*dır.
- Pazartesi 00:00'da durum kendiliğinden döner; açık kalan sekmeler `next_change_at` anında durumu yeniden okur.

## Sanal POS

`backend/apps/payments/pos/` altında sağlayıcı soyutlaması vardır: `iyzico` (Checkout Form), `paytr` (iframe/token) ve harici çağrı yapmayan `sandbox`.

- **Kart verisi hiçbir zaman bu sunucuya girmez.** Her sağlayıcı, kullanıcıyı kendi barındırdığı 3D Secure sayfasına yönlendirir; uygulama yalnızca sipariş referansı, tutar, durum ve kart dışı yanıt alanlarını saklar (`payments_pos_payment`).
- **Bildirime asla güvenilmez:** PayTR bildirimi HMAC-SHA256 imzasıyla doğrulanır, iyzico'da ödeme durumu sağlayıcıya sunucudan tekrar sorularak teyit edilir. Tutar da karşılaştırılır; yinelenen bildirimler idempotenttir (erişim iki kez uzatılmaz).
- Uçlar: `GET /payments/pricing/` · `GET /payments/pos/config/` · `POST /payments/pos/checkout/` · `POST /payments/pos/callback/<provider>/` · `GET /payments/pos/<merchant_oid>/` · `GET /payments/pos/payments/`.
- Callback adresi sağlayıcı paneline şu biçimde girilir: `https://$DOMAIN/api/v1/payments/pos/callback/paytr/` (veya `.../iyzico/`).
- `POS_PROVIDER` boşken ödeme başlatma `503 POS_NOT_CONFIGURED` döner ve eksik ayar adları (yalnızca staff'a) listelenir — sessizce başarılı sayılan hiçbir varsayılan yoktur.

### iyzico üye iş yeri web sitesi kriterleri

iyzico başvurusu, sanal POS entegrasyonundan ayrı olarak sitenin kendisinde bir dizi bilgiyi arar. Hepsi frontend tarafında karşılanmıştır:

| Kriter | Nerede |
| --- | --- |
| Teslimat ve iade koşulları | `/teslimat-ve-iade` — `frontend/app/(marketing)/teslimat-ve-iade/` |
| Mesafeli satış sözleşmesi | `/mesafeli-satis-sozlesmesi` |
| iyzico, Visa, Mastercard logoları | `frontend/components/shared/payment-methods.tsx`; altbilgi, fiyatlandırma, iletişim ve marka ödeme panelinde basılır. Logolar `frontend/public/payment/` altında kendi sunucumuzdan verilir. |
| Vergi levhası bilgileri (künye) | `frontend/lib/company.ts` → altbilgi, `/iletisim`, `/teslimat-ve-iade`, `/mesafeli-satis-sozlesmesi` |
| Fiyatların TL ve KDV dahil gösterimi | `/fiyatlandirma` ve satın alma kutusu |
| Sözleşme onayı (ödeme öncesi) | `frontend/features/brands/brand-access-purchase.tsx` — onay kutusu işaretlenmeden ödeme başlatılamaz |
| Gizlilik politikası / KVKK / çerezler | `/gizlilik-politikasi`, `/kvkk` |

> **Başvurudan önce doldurulması zorunlu:** `frontend/lib/company.ts` içindeki `legalName`, `taxOffice`, `taxNumber`, `address` ve `phone` alanları boştur ve **vergi levhasındaki bilgilerle birebir** doldurulmalıdır. `legalName` boş olduğu sürece künye blokları siteye hiç basılmaz (site uydurma künye yayınlamasın diye), dolayısıyla iyzico bu kriteri karşılanmamış sayar.


## Deployment (VPS)

1. Point the domain's DNS `A` record at the VPS.
2. `git clone` the repo, `cd` into it.
3. `cp .env.production.example .env` and fill in every placeholder (secret key, DB password, domain, `RESEND_API_KEY`).
4. `./scripts/deploy.sh` — pulls latest, builds, starts everything with `docker compose up -d`, waits for the backend healthcheck, prunes dangling images.
5. Caddy automatically obtains and renews a Let's Encrypt certificate for `$DOMAIN` on first request — no manual TLS setup.

Changing domains later is a one-line edit: update `DOMAIN` in `.env`, then `docker compose up -d caddy`.

## Backups

```bash
./scripts/backup.sh
```

Manual, on-demand only — nothing schedules this automatically (if your VPS provider already takes daily snapshots, that's your safety net; run this script yourself before a risky migration or deploy). Dumps Postgres via `pg_dump`, gzips it into `postgres/backups/`, and keeps only the most recent 7 backups. Restore:

```bash
gunzip -c postgres/backups/trugc-<timestamp>.sql.gz | docker compose exec -T db psql -U trugc -d trugc
```

## Health checks

```bash
./scripts/healthcheck.sh
```

Checks Postgres (`pg_isready`), Redis (`PING`), backend (`/healthz/` — verifies both the DB and Redis connections from inside Django), and frontend (`/`), printing a clear `[OK]`/`[FAIL]` line per service and exiting non-zero if anything is down. Docker Compose also runs equivalent healthchecks continuously (see `docker-compose.yml`), gating `depends_on: condition: service_healthy` so services don't start against a not-yet-ready dependency.

## Troubleshooting

- **`docker compose up` fails on `backend` immediately**: check `docker compose logs backend` — `entrypoint.sh` waits up to 30s for Postgres before failing loudly; a longer-than-that Postgres cold start (e.g. first-ever volume init) can race it. Restart with `docker compose up backend`.
- **Frontend shows login/API errors, backend is healthy**: confirm `NEXT_PUBLIC_API_BASE_URL`/`DJANGO_API_URL` are set correctly — the frontend build bakes `NEXT_PUBLIC_*` vars in at build time, so changing them requires `docker compose build frontend` again, not just a restart.
- **CORS errors in the browser console**: `CORS_ALLOWED_ORIGINS`/`CSRF_TRUSTED_ORIGINS` on the backend must include the exact origin the frontend is served from (protocol + host + port).
- **Verification/password-reset emails never arrive**: with no `RESEND_API_KEY` (the default in dev) the console backend is used — the email is printed to `docker compose logs backend` instead of being sent. In production, run `python manage.py check` (accounts.W001–W004 flag a missing key, an unverifiable sender domain or a mismatched backend) and test delivery with `docker compose exec backend python manage.py send_test_email you@example.com`. Sends fail silently by design, so provider errors (403 unverified domain, 401 bad key, 429 rate limit) only show up as ERROR lines in the backend log.
- **Uploaded media 404s through Caddy**: confirm the `media_data` volume is mounted into both `backend` (`/app/media`) and `caddy` (`/srv/media`) — see `docker-compose.yml`.

2026 TRUGC Tüm hakları saklıdır.
