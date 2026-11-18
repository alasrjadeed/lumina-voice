#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="$ROOT/docker-compose.yml"
URL="http://localhost:4310/"

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Start it with: sudo systemctl start docker" >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx lumina-voice; then
  docker-compose -f "$COMPOSE" up -d >/dev/null
fi

for _ in $(seq 1 20); do
  if curl -fsS -o /dev/null "$URL"; then break; fi
  sleep 1
done

xdg-open "$URL"
