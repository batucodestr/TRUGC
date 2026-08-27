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
| `EMAIL_*`, `DEFAULT_FROM_EMAIL` | SMTP for verification/password-reset emails. Dev uses Django's console backend (nothing is actually sent); set real SMTP creds in production. |
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

## Deployment (VPS)

1. Point the domain's DNS `A` record at the VPS.
2. `git clone` the repo, `cd` into it.
3. `cp .env.production.example .env` and fill in every placeholder (secret key, DB password, domain, SMTP creds).
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
- **Verification/password-reset emails never arrive**: `EMAIL_HOST` is empty by default in dev (console backend — check `docker compose logs backend` for the printed email instead). Set real SMTP creds in production.
- **Uploaded media 404s through Caddy**: confirm the `media_data` volume is mounted into both `backend` (`/app/media`) and `caddy` (`/srv/media`) — see `docker-compose.yml`.
