#!/bin/sh
# scripts/entrypoint.sh
# Runs Prisma DB migrations at container start, then starts Next.js.
# Safe to run on every restart — migrate deploy is idempotent.

set -e

echo "→ Running Prisma migrations…"
npx prisma migrate deploy

echo "→ Starting Next.js…"
exec node server.js
