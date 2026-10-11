# Runbook

Phase 0 placeholder. Real runbook content lands in Phase 1 once there's
a deployable reader surface and a real environment to run it in.

## Local dev

```bash
make doctor         # preflight: Docker, Node, ports, .env
make up             # web + db online
make logs           # tail everything
make ps             # container status
make smoke          # hit / and /api/health
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
