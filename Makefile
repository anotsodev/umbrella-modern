.PHONY: help up down reset logs ps doctor install dev build start migrate seed test lint typecheck qa smoke backup clean

# Default: show available commands
help:
	@echo "umbrella-modern — dev workflow"
	@echo ""
	@echo "  make up        Bring stack online (idempotent: re-runs are safe)"
	@echo "  make down      Stop stack (keeps data)"
	@echo "  make reset     Nuke volumes and rebuild from scratch"
	@echo "  make logs      Tail stack logs"
	@echo "  make ps        Show container status"
	@echo "  make doctor    Preflight checks (Docker, ports, Node, .env)"
	@echo "  make install   Install Node dependencies (idempotent)"
	@echo "  make dev       Run the app natively (fastest HMR)"
	@echo "  make build     Production build"
	@echo "  make start     Run production build"
	@echo "  make migrate   Run DB migrations (idempotent)"
	@echo "  make import-content   Clone securityfirst/umbrella-content and upsert into DB"
	@echo "  make seed      Seed the database (alias for import-content for now)"
	@echo "  make test      Run the test suite"
	@echo "  make lint      Run the linter"
	@echo "  make typecheck Run the TypeScript checker"
	@echo "  make qa        Canonical QA pass (doctor → lint → typecheck → test → build → smoke)"
	@echo "  make smoke     Boot stack and hit key endpoints"
	@echo "  make backup    Dump Postgres to a named volume (caller wires the cron)"
	@echo "  make clean     Remove build artifacts and node_modules"

# --- Stack lifecycle ---
up:
	docker compose up -d --wait
	@echo ""
	@echo "✅ Stack up. App: http://localhost:3000  DB: localhost:5432"

down:
	docker compose down

# Idempotent: removes named volumes so the next `up` runs migrations cleanly.
reset:
	docker compose down -v
	$(MAKE) up

logs:
	docker compose logs -f

ps:
	docker compose ps

# --- Preflight ---
doctor:
	@bash bin/doctor

# --- App lifecycle ---
install:
	npm ci

# Run the app natively (outside the container) for the fastest HMR.
# Assumes the DB container is running and DATABASE_URL points at it.
dev:
	npm run dev

build:
	npm run build

start:
	npm start

migrate:
	@bash bin/migrate

seed:
	@echo "  ⚠ no seed yet — use 'make import-content' for umbrella-content"

import-content:
	@echo "▶ Importing umbrella-content into Postgres"
	@docker compose exec -T web npm run import-content
	@echo ""
	@echo "✅ Import complete."

# --- Quality ---
test:
	npm test -- --run

lint:
	npm run lint

typecheck:
	npm run typecheck

# Canonical QA pass. Idempotent. Fails fast and loudly.
qa:
	@echo "▶ doctor"
	@bash bin/doctor
	@echo "▶ lint"
	@npm run lint
	@echo "▶ typecheck"
	@npm run typecheck
	@echo "▶ test"
	@npm test -- --run
	@echo "▶ build"
	@npm run build
	@echo "▶ smoke"
	@$(MAKE) smoke
	@echo ""
	@echo "✅ QA pass green. Ready for review."

# Smoke test: bring the stack up, hit the app root and a real API endpoint.
smoke:
	@bash bin/smoke

# --- Backups ---
# Daily `pg_dump` to a named volume that an external backup runner
# (e.g. ~/Projects/backblaze-backup-runner.sh) can pick up.
# Wired but NOT enabled — Phase 1 must be deployable first.
backup:
	@bash bin/backup-pg

# --- Cleanup ---
clean:
	rm -rf node_modules .next out dist build
	@echo "🧹 Local artifacts removed. Run 'make up' to bring the stack back."
