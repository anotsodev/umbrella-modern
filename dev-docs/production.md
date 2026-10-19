# Production deployment (Docker Compose)

`compose.yml` / `make up` are **development only**. Use the standalone
`compose.prod.yml` for production; do not combine the two with multiple `-f` flags.
The production web service builds the Dockerfile's `runner` stage and runs
`next start`, with no source, node_modules, or .next mounts and no HMR.

## 1. Configure runtime secrets

```bash
cp deploy/production.env.example .env.production
```

Fill in every required value in `.env.production`:

- `POSTGRES_PASSWORD`: for a new database, generate a URL-safe password with
  `openssl rand -hex 32`. For the **existing** database volume, use its current
  `app` role password (the development stack originally initializes it as `app`).
  Changing this env value does **not** rotate an existing database password.
  Rotate weak development credentials separately before public deployment; use
  URL-encoded credentials if the password contains URL-reserved characters.
- `BETTER_AUTH_SECRET`: use the existing secret when migrating, or generate a new
  one with `openssl rand -hex 32`. Changing it invalidates existing sessions.
- `BETTER_AUTH_URL`: the public HTTPS origin, e.g. `https://umbrella.dnys.dev`.
- `RESEND_API_KEY` and `EMAIL_FROM`: a Resend API key and verified sender address.
  Production cannot use the development console-only magic-link transport.

Real env files are gitignored and excluded from the Docker build context. The
build uses an auth placeholder only for route collection; the real secret must
be provided at runtime. Never pass real secrets as Docker build arguments.

The host port defaults to `127.0.0.1:3000`. Point the host's HTTPS reverse proxy
or tunnel there. If the proxy is on another machine, set `WEB_BIND_ADDRESS` to
an appropriate interface and firewall access to the proxy. A containerized
proxy's localhost is not the host's localhost; configure its network/upstream
accordingly. Forward the public Host and X-Forwarded-Proto headers.

## 2. Validate and build (does not stop the current site)

```bash
docker compose --env-file .env.production -f compose.prod.yml config --quiet
docker compose --env-file .env.production -f compose.prod.yml build web tools
```

A build requires network access for npm dependencies and Google Fonts. No live
database is needed for the image build. The runtime image retains the Next.js
configuration and Prisma/OpenSSL runtime support.

**Why does the build need `DATABASE_URL`?** `lib/db.ts` constructs a `PrismaClient`
at module load, so it is imported transitively while Next.js collects routes
even though no query is actually executed. The Dockerfile passes a placeholder
URL (`postgresql://build:build@127.0.0.1:5432/build`) at build time; the real
`DATABASE_URL` is supplied at runtime via the Compose service. The
`BETTER_AUTH_SECRET` placeholder works the same way.

## 3. Back up before switching or changing schema

For the currently running **development** stack:

```bash
mkdir -p backups
docker compose exec -T db pg_dump -U app -d app -Fc > "backups/pre-production-$(date +%Y%m%d-%H%M%S).dump"
```

Check the dump command succeeds and verify the backup before proceeding.
Copy it to protected off-host storage; it may contain account and user data.
Also back up the `umbrella-modern-content` volume if it contains local changes.

## 4. Switch to production (brief downtime)

Run from this same checkout/project directory to retain the Compose project
identity. Both files explicitly use the existing `umbrella-modern-pgdata` and
`umbrella-modern-content` volumes. Do not run dev and prod against these volumes
concurrently. **Never use `down -v` or `make reset` on production data.**

After the build and backup have succeeded:

```bash
# Stop the old dev stack, retaining its volumes.
docker compose down

# Start only Postgres first.
docker compose --env-file .env.production -f compose.prod.yml up -d --wait db
```

For an existing database whose schema/content are already current, skip the next
command. For a fresh deployment (or a reviewed schema update), explicitly run:

```bash
docker compose --env-file .env.production -f compose.prod.yml --profile maintenance run --rm tools
```

The tools job runs `prisma db push --skip-generate` then imports content only if
the categories table is empty. It does not accept data loss automatically. Review
schema changes and back up first; the repository does not yet have a versioned
Prisma migration history suitable for `prisma migrate deploy`.

On a **fresh** database, also install full-text search after schema/import:

```bash
docker compose --env-file .env.production -f compose.prod.yml exec -T db \
  psql -U app -d app -v ON_ERROR_STOP=1 < prisma/migrations/fts.sql
```

Skip this if FTS is already installed. This existing SQL drops/rebuilds the search
column/index and backfills all rows; it can lock a populated table and should
only run in a planned maintenance window.

Start the production web service:

```bash
docker compose --env-file .env.production -f compose.prod.yml up -d --wait web
docker compose --env-file .env.production -f compose.prod.yml ps
docker compose --env-file .env.production -f compose.prod.yml logs --tail=80 web
curl --fail --silent --output /dev/null --write-out '%{http_code}\n' http://127.0.0.1:3000/en
```

Expect a healthy web service, `next start` startup logs, and HTTP `200` for `/en`.
The health check exercises the homepage and database rather than a nonexistent
health endpoint. Check the public HTTPS site, content images, search, and email
sign-in as well. Refresh any browser tabs previously loaded from the dev server.

## Subsequent deployments

Back up, review schema changes, build, run maintenance only if needed, then:

```bash
docker compose --env-file .env.production -f compose.prod.yml up -d --build --wait web
```

Do not use `make up`, `make migrate`, or `make reset` for production; those target
the development Compose file. For rollback, retain a known-good image and backup;
application rollback alone does not undo schema/data changes.

## Hardening backlog

Small, ordered set of additional hardening steps deferred from the initial
production rollout. Each is opt-in and tested before flipping the default.

1. **Dedicated `/api/health` route.** Replace the homepage-fetch healthcheck
   with a route that explicitly answers "process up" (always 200 unless the
   Node event loop is wedged) and a separate `/api/ready` that touches the DB
   and Prisma client. Lets Kubernetes/Compose distinguish liveness from
   readiness and prevents a transient DB outage from restarting the container.
2. **`read_only: true` on the `web` service.** Requires tmpfs mounts for
   `/tmp` (Prisma engine) and `/app/.next/cache` (Next.js build cache). Verify
   the production build has no other writable paths first; some libraries
   write to `~/.cache` or `/home/nextjs`.
3. **`cap_drop: [ALL]` plus a tight `cap_add` allowlist.** Node.js needs no
   special capabilities today, so dropping all is safe in principle. Verify
   with the healthcheck and a sample sign-in flow before shipping.
4. **Rootless or non-root Compose project.** The `web` container already runs
   as `nextjs` (uid 1001); moving the entire stack to rootless Docker is the
   next step if your host supports it.
5. **Image provenance.** Add a CI step to push the runner image to a registry
   with cosign signing and a SLSA provenance attestation. The Dockerfile is
   already deterministic enough for this; no code change required.

## FAQ

**`public/content` is empty in the image but full at runtime — does the build
depend on it?** No. All content is rendered from Postgres via `lib/reader.ts`
at request time, so the build does not read `public/content`. The directory is
populated at runtime by the `umbrella-modern-content` named volume
(`compose.prod.yml` mounts it read-only at `/app/public/content`). Excluding
`public/content` from the build context in `.dockerignore` keeps the image
small and is intentional.
