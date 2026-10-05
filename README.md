# Hourglass

A lightweight meeting-availability poll. A host picks candidate dates and marks
their own availability; anyone with the link can add theirs, with no account
required on either side. Availability overlaps live, and the host picks a
final time when they're ready.

## How identity works (read this before deploying)

There are no user accounts in this version. Instead:

- **Hosts** get a private **manage link** when they create a poll. That link
  (plus a cookie in the browser that created it) is the only way to manage
  the poll. **There is no password reset or email recovery** — if a host
  loses both the cookie and the link, the poll can no longer be managed.
  Encourage hosts to save that link somewhere durable.
- **Participants** get a private **response link** after they respond, for
  editing from another device. Losing it just means submitting a fresh
  response — not a security problem, just a minor inconvenience.
- Two *optional* passwords exist per poll: a **view password** (gates the
  whole poll) and a **host password** (an extra check, required only to
  *delete* a poll — never a way to lock yourself out of managing one).

This is a deliberate trade-off: no accounts and no email infrastructure, in
exchange for a fully frictionless "open link → respond" flow. See the
project's architecture plan for the full reasoning.

## Local development

Requirements: Node 20+, a local PostgreSQL instance.

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL and TOKEN_PEPPER
npm run db:migrate           # applies drizzle/ migrations
npm run dev
```

Generate a `TOKEN_PEPPER` with `openssl rand -base64 32`. `APP_ORIGIN` should
match wherever you're loading the app from (`http://localhost:3000` by
default) — mutating requests are rejected if their `Origin` doesn't match it.

Schema changes go in `src/db/schema.ts`; run `npm run db:generate` to produce
a new migration file under `drizzle/`, then `npm run db:migrate` to apply it.

## Self-hosted deployment (Docker)

> Deploying behind a control panel (CloudPanel, etc.) or want a Docker
> walkthrough from scratch? See [DEPLOY.md](./DEPLOY.md) — it covers running
> this stack alongside a panel's own reverse proxy/TLS instead of the
> bundled Caddy below.

```bash
cp .env.example .env
# fill in POSTGRES_*, APP_ORIGIN (your real domain, https://), TOKEN_PEPPER, DOMAIN
docker compose up -d --build
```

This brings up three services by default (see `docker-compose.yml`):

- `postgres` — the database, on an internal-only Docker network.
- `migrate` — a one-shot job that applies pending migrations; `app` waits
  for it to finish successfully before starting.
- `app` — the Next.js server (`Dockerfile`'s `runner` stage — a slim,
  standalone production build), reachable at `127.0.0.1:${APP_PORT:-3100}`
  on the host — not the public internet.

A fourth, **optional** service, `caddy`, is behind a Compose profile and
skipped by default:

```bash
docker compose --profile caddy up -d --build
```

It gets you automatic Let's Encrypt TLS for `DOMAIN` with nothing else to
configure — a full, standalone HTTPS setup with no control panel involved.
If you're fronting the app with a panel (CloudPanel, etc.) or your own
proxy instead, skip this and see [DEPLOY.md](./DEPLOY.md) — just make sure
whatever does front it sets `X-Forwarded-For`, since that's what the
in-app rate limiter trusts to identify clients. **Never expose the `app`
service's port directly to the internet** — it assumes a trusted proxy in
front.

Requires Docker Compose v2 (the `service_completed_successfully` dependency
condition isn't available in the old standalone `docker-compose` v1 tool).

### Backups

Only `postgres_data` needs backing up — everything else is derived or
reproducible from the image. A simple approach:

```bash
docker compose exec postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

## Known, accepted trade-offs

- **No host account recovery.** See "How identity works" above.
- **Rate limiting is in-process and single-instance.** It resets on
  restart and won't coordinate across replicas if this is ever scaled
  horizontally — fine for a single self-hosted container, but the first
  thing to swap for a Redis-backed limiter if that changes.
- **A poll's time-of-day window can't cross local midnight** (e.g. "10 PM
  to 2 AM" isn't expressible as a single window) — a deliberate MVP
  simplification given how rare overnight-meeting polls are for this
  product.
- **Duplicate participant names are allowed.** Names are never used as an
  identity/lookup key (only the bearer token is), so this is harmless by
  design, not a bug.
