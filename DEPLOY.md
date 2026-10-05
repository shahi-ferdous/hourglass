# Deploying Hourglass to your VPS (with CloudPanel + Cloudflare)

This walks through getting `hourglass.remotely.life` live on your VPS,
alongside CloudPanel, using Docker. It also explains the Docker concepts as
they come up, since this may be your first time using it.

## The shape of this deployment

```
Browser → Cloudflare (DNS) → your VPS → CloudPanel's web server (TLS, port 443)
                                           → reverse proxy → Docker: app container (port 3000)
                                                                → Docker: postgres container
```

CloudPanel keeps doing exactly what it already does for your other
sites — owns ports 80/443, terminates HTTPS, renews the Let's Encrypt
certificate. Docker just runs the app and its database behind that, on a
port only reachable from the VPS itself (`127.0.0.1`), not the public
internet. Nothing about your existing CloudPanel sites changes.

## Docker, in four ideas

You don't need more than this to follow along:

- **Image** — a read-only template: "here's Node, here's the app's code,
  here's how to start it." Built once from the `Dockerfile` in this repo.
- **Container** — a running instance of an image. Same relationship as a
  class and an object — you can start/stop/delete a container without
  touching the image it came from.
- **Volume** — a folder Docker manages outside any container, so data
  survives even if you delete and recreate the container. Postgres's actual
  data lives in a volume, not inside the Postgres container itself.
- **`docker-compose.yml`** — describes several containers ("services") as
  one unit: what image each one runs, what environment variables it gets,
  which ones can talk to each other, and in what order to start them. This
  repo already has one (`postgres`, `migrate`, `app`, and an optional
  `caddy` you won't be using).

Every command below is run over SSH, on the VPS itself.

## 1. Install Docker on the VPS

```bash
curl -fsSL https://get.docker.com | sh
```

This is Docker's own official install script — safe, standard, and it
detects your distro automatically. It installs the Docker Engine plus the
`docker compose` plugin (what this repo's `docker-compose.yml` needs; note
it's `docker compose`, no hyphen — that's the modern one).

Let your user run `docker` without `sudo` every time (optional, but
convenient):

```bash
sudo usermod -aG docker $USER
```

Log out and back in (or run `newgrp docker`) for that to take effect. Check
it worked:

```bash
docker --version
docker compose version
```

## 2. Get the code onto the VPS

Pick one:

**A — Git (recommended if you want easy updates later).** Push this repo
to a private GitHub/GitLab repo from your machine, then on the VPS:

```bash
git clone <your-repo-url> hourglass
cd hourglass
```

**B — Copy directly**, no git needed, from your local machine:

```bash
rsync -avz --exclude node_modules --exclude .next --exclude .git \
  /Users/shahiferdous/Documents/Sites/Hourglass/ \
  you@your-vps-ip:~/hourglass/
```

(This repo has no commits yet — tell me if you want a GitHub repo set up
and I'll help with that part before you pick A.)

## 3. Create the production `.env`

On the VPS, inside the project folder:

```bash
cp .env.example .env
nano .env   # or vim, whatever you're comfortable with
```

Fill in:

```bash
POSTGRES_USER=hourglass
POSTGRES_PASSWORD=<generate one: openssl rand -base64 24>
POSTGRES_DB=hourglass

APP_ORIGIN=https://hourglass.remotely.life
TOKEN_PEPPER=<generate one: openssl rand -base64 32>
DELETE_GRACE_DAYS=30

# Not used in this setup (no bundled Caddy), safe to leave as-is:
DOMAIN=hourglass.remotely.life
```

`DATABASE_URL` in `.env.example` can stay as-is or be removed — the
compose file builds the real one itself from the `POSTGRES_*` values for
the `migrate` and `app` services.

**`TOKEN_PEPPER` is the one secret that actually matters for security** —
it's what the server uses to verify every manage-link and response-link
token. Generate it once, keep `.env` out of git (already gitignored), and
don't regenerate it later unless you want every existing link to stop
working.

## 4. Start the stack

```bash
docker compose up -d --build
```

What this does: builds the `app` image from the `Dockerfile` (installs
dependencies, compiles the Next.js app), pulls the official `postgres`
image, starts Postgres, runs the one-shot `migrate` service to set up the
database tables, then starts `app` — in that order, because the compose
file says `app` depends on `migrate` finishing successfully first.

- `-d` — "detached," runs in the background instead of tying up your
  terminal.
- `--build` — rebuild the image from the current `Dockerfile`/source
  instead of reusing a stale one. You'll use this again every time you
  deploy a code update.

Check everything came up:

```bash
docker compose ps
```

You should see `postgres` and `app` as `running` (and `healthy` for
postgres), and `migrate` as `exited (0)` — exited with code 0 is correct,
it's a one-shot job, not a long-running service.

Watch the app's logs (Ctrl+C to stop watching, doesn't stop the container):

```bash
docker compose logs -f app
```

Confirm it's actually listening locally:

```bash
curl -I http://127.0.0.1:3100
```

You should get back `HTTP/1.1 200 OK`. If you changed `APP_PORT` in
`.env`, use that port instead of 3100.

## 5. Point CloudPanel at it

In the CloudPanel UI:

1. **Sites → Add Site → Reverse Proxy** (not Node.js — the app is already
   running in its own container; CloudPanel's job here is purely to be the
   public HTTPS front door).
2. Domain: `hourglass.remotely.life`
3. Reverse proxy target: `http://127.0.0.1:3100` (match whatever
   `APP_PORT` you set).
4. Once the site's created, go to its **SSL/TLS** tab and issue a Let's
   Encrypt certificate, then enable "Force HTTPS."

(CloudPanel's exact menu wording can vary a little by version — if you
don't see "Reverse Proxy" as a site type, tell me what options you *do*
see and I'll adjust.)

## 6. DNS on Cloudflare

Add a DNS record for the subdomain, pointing at your VPS's IP:

- Type: `A`
- Name: `hourglass`
- Value: your VPS's public IP
- Proxy status: **DNS only (grey cloud) at first** — issue the Let's
  Encrypt cert in CloudPanel while it's grey-clouded, confirm HTTPS works,
  *then* switch it to **Proxied (orange cloud)** if you want Cloudflare's
  CDN/DDoS protection in front too. Doing it in that order avoids any
  chicken-and-egg issue between Cloudflare and CloudPanel's certificate
  issuance.

## 7. Smoke test

Visit `https://hourglass.remotely.life`, create a test poll, open it from
a different browser/profile, submit a response, and confirm the host
dashboard shows it. Delete the test poll when you're done.

## Day-to-day after this

**Deploying a code update:**

```bash
cd ~/hourglass
git pull            # or re-sync via rsync
docker compose up -d --build
```

**Logs:**

```bash
docker compose logs -f app        # just the app
docker compose logs -f            # everything
```

**Backups** (the only stateful thing is Postgres's volume):

```bash
docker compose exec postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup-$(date +%F).sql
```

**Restart everything:**

```bash
docker compose restart
```

**Stop everything** (data stays intact in the volume):

```bash
docker compose down
```

## One thing worth verifying once it's live

The app rate-limits things like password attempts per visitor IP, read
from the `X-Forwarded-For` header. With Cloudflare → CloudPanel → Docker
in the chain, that header should already carry the real visitor IP by
default on both hops — but it's worth a quick check after launch: if two
different real visitors ever get rate-limited as if they were "the same
IP," that header isn't being forwarded correctly somewhere in the chain,
and CloudPanel's reverse-proxy template would be the place to look.
