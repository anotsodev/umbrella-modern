# Runbook

Phase 0 placeholder. Real runbook content lands in Phase 1 once there's
a deployable reader surface and a real environment to run it in.

## Local dev

```bash
make doctor         # preflight: Docker, Node, ports, .env
make up             # web + db online
make logs           # tail everything
make ps             # container status
make smoke          # hit / and /api/health (liveness only; not feature coverage)
make down           # stop stack (keeps data)
make reset          # nuke volumes, rebuild from scratch
make backup         # pg_dump → umbrella-modern-pgdumps volume
```

## Known gaps (Phase 0)

- No `/api/health` route yet — `make smoke` accepts 404 on it.
- `make backup` is wired but the cron is **not** enabled. Enable after
  Phase 1 ships.
- The `umbrella-content` volume is mounted but empty. Phase 1 binds
  a local clone of `https://github.com/securityfirst/umbrella-content`
  to `/app/public/content`.
- No deploy target. `compose.yml` is local-only.

### Adding host-installed dependencies

Anything installed on the host (`npm install <pkg>` from the repo root)
does NOT exist in the Docker image. After adding a host dependency, run
`docker compose build web --no-cache` before `make up`, or `make up`
will boot an image missing the new dep. The cause is `npm ci` in the
Dockerfile deps stage vs. `npm install` on the host.

**Phase 0 follow-up:** automate a `bin/doctor` warning for this drift.
