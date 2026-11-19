#!/usr/bin/env bash
# Install the 15-minute catalogue publisher on this machine. The job reads
# .env.local itself, so cron needs no exported secrets.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NPM="$(command -v npm)"
MARKER="lumina-voice catalogue export"
LINE="*/15 * * * * cd \"$ROOT\" && \"$NPM\" run catalogue:export >> \"$ROOT/data/catalogue-cron.log\" 2>&1 # $MARKER"

command -v crontab >/dev/null 2>&1 || { echo "crontab is not installed" >&2; exit 1; }
mkdir -p "$ROOT/data"
TMP="$(mktemp)"
{ crontab -l 2>/dev/null | grep -Fv "$MARKER" || true; printf '%s\n' "$LINE"; } > "$TMP"
crontab "$TMP"
rm -f "$TMP"
echo "Installed: $LINE"
