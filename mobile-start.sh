#!/usr/bin/env bash
# mobile-start.sh — запускает туннель для Metro + Expo Go
#
# Проблема: ngrok free = 1 сессия = нельзя добавить второй туннель для Metro.
# Решение: ngrok → backend (порт 3000, статический домен)
#          localtunnel → Metro (порт 8081, динамический URL, бесплатно)
#
# Использование: ./mobile-start.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE="$ROOT/apps/mobile"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✓${NC} $*"; }
warn() { echo -e "${YELLOW}  →${NC} $*"; }
fail() { echo -e "${RED}  ✗${NC} $*"; exit 1; }

# ─── 1. Убеждаемся что ngrok для бекенда запущен ─────────────────────────────
if ! curl -sf http://127.0.0.1:4040/api/tunnels &>/dev/null; then
  warn "ngrok не найден — запускаю туннель для бекенда..."
  ngrok start backend >/tmp/ngrok-backend.log 2>&1 &
  for i in $(seq 1 15); do
    curl -sf http://127.0.0.1:4040/api/tunnels &>/dev/null && break
    sleep 1
    (( i == 15 )) && fail "ngrok не запустился. Лог: $(tail -5 /tmp/ngrok-backend.log)"
  done
fi
ok "Backend : https://metalled-imperatorially-eusebia.ngrok-free.dev"

# ─── 2. Запускаем Metro туннель через localtunnel ────────────────────────────
warn "Создаю туннель для Metro (порт 8081) через localtunnel..."
LT_OUTPUT=$(mktemp)
# Используем фиксированный subdomain чтобы URL был стабильным
npx --yes localtunnel --port 8081 --subdomain pc-remote-metro > "$LT_OUTPUT" 2>&1 &
LT_PID=$!

# Ждём появления URL
METRO_URL=""
for i in $(seq 1 20); do
  METRO_URL=$(grep -oP 'https://[^\s]+' "$LT_OUTPUT" 2>/dev/null | head -1 || true)
  [ -n "$METRO_URL" ] && break
  sleep 1
done

if [ -z "$METRO_URL" ]; then
  # Если subdomain занят — пробуем без subdomain (случайный URL)
  warn "Subdomain занят, пробую случайный URL..."
  kill "$LT_PID" 2>/dev/null || true
  npx localtunnel --port 8081 > "$LT_OUTPUT" 2>&1 &
  LT_PID=$!
  for i in $(seq 1 20); do
    METRO_URL=$(grep -oP 'https://[^\s]+' "$LT_OUTPUT" 2>/dev/null | head -1 || true)
    [ -n "$METRO_URL" ] && break
    sleep 1
  done
fi

[ -z "$METRO_URL" ] && fail "Не удалось запустить localtunnel. Лог: $(cat "$LT_OUTPUT")"
rm -f "$LT_OUTPUT"

ok "Metro   : $METRO_URL"

# ─── 3. Инструкции ───────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════"
echo "  Для Expo Go на телефоне:"
echo "  1. Установи приложение Expo Go"
echo "  2. Отсканируй QR-код ниже"
echo "  3. При первом открытии URL нажми 'Click to Visit'"
echo "     (разовая проверка localtunnel)"
echo "══════════════════════════════════════════════════════"
echo ""

# ─── 4. Запускаем Expo ───────────────────────────────────────────────────────
cd "$MOBILE"
EXPO_PACKAGER_PROXY_URL="$METRO_URL" npx expo start

# Cleanup
kill "$LT_PID" 2>/dev/null || true
