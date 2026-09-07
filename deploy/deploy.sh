#!/usr/bin/env bash
#
# EZiWear server-side deploy — runs ON the server (called by CI over SSH, or by hand).
# Idempotent: safe to re-run. Assumes the repo is already checked out and up to date.
#
#   Layout on the server:
#     <repo>/                 git checkout (this script lives in deploy/)
#     <repo>/.env             production env — NOT in git, created once (see deploy/README.md)
#     <repo>/frontend/dist/frontend/browser   Angular static build (served by nginx)
#     <repo>/backend/dist                     compiled API (run by systemd: eziwear-api.service)
#
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

echo "==> Deploy from $REPO_DIR @ $(git rev-parse --short HEAD)"

if [[ ! -f .env ]]; then
  echo "!! $REPO_DIR/.env is missing — create it first (see deploy/README.md)" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Backend
# ---------------------------------------------------------------------------
echo "==> Backend: install + build"
cd "$REPO_DIR/backend"
# devDeps needed: tsx + knex CLI drive the migrations
npm ci --include=dev
npm run build

echo "==> Backend: run migrations"
# knexfile.ts reads ../.env and picks the config key from NODE_ENV (production)
npm run db:migrate

# ---------------------------------------------------------------------------
# Frontend
# ---------------------------------------------------------------------------
echo "==> Frontend: install + build"
cd "$REPO_DIR/frontend"
npm ci --include=dev
npx ng build --configuration production
# nginx serves frontend/dist/frontend/browser/

# ---------------------------------------------------------------------------
# Restart API
# ---------------------------------------------------------------------------
echo "==> Restart eziwear-api.service"
sudo systemctl restart eziwear-api.service
sleep 2
sudo systemctl --no-pager --lines=10 status eziwear-api.service || true

# Health check against the local port from .env (default 5002)
PORT="$(grep -E '^PORT=' "$REPO_DIR/.env" | cut -d= -f2 | tr -d '[:space:]')"
PORT="${PORT:-5002}"
echo "==> Health check http://127.0.0.1:${PORT}/api/v1/health"
curl -fsS --retry 5 --retry-delay 2 "http://127.0.0.1:${PORT}/api/v1/health" && echo
echo "==> Deploy OK"
