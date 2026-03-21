#!/usr/bin/env bash
# dev.sh — проверяет и запускает сервисы pc-remote
# Использует tmux: каждый сервис — отдельное окно в сессии "pcr"
# Использование: ./dev.sh [status|stop]

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSION="pcr"

# ─── цвета ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✓${NC} $*"; }
warn() { echo -e "${YELLOW}  →${NC} $*"; }
fail() { echo -e "${RED}  ✗${NC} $*"; }

# ─── хелперы ──────────────────────────────────────────────────────────────────

port_listening() { ss -tlnp 2>/dev/null | grep -q ":$1 "; }

container_healthy() {
  docker ps --filter "name=$1" --filter "status=running" \
    --format "{{.Names}}" 2>/dev/null | grep -q "$1"
}

tmux_window_exists() {
  tmux list-windows -t "$SESSION" 2>/dev/null | grep -q "^[0-9]*: $1"
}

tmux_ensure_session() {
  if ! tmux has-session -t "$SESSION" 2>/dev/null; then
    tmux new-session -d -s "$SESSION" -n "main"
  fi
}

# Запустить команду в именованном окне tmux (не создавать дубли)
tmux_start() {
  local name="$1"; shift
  local dir="$1";  shift
  local cmd="$*"

  tmux_ensure_session

  if tmux_window_exists "$name"; then
    # окно уже есть — убиваем старый процесс и перезапускаем
    warn "Перезапускаю $name..."
    tmux send-keys -t "$SESSION:$name" C-c "" 2>/dev/null || true
    sleep 1
    tmux send-keys -t "$SESSION:$name" "cd $dir && $cmd" Enter
  else
    warn "Запускаю $name..."
    tmux new-window -t "$SESSION" -n "$name"
    tmux send-keys -t "$SESSION:$name" "cd $dir && $cmd" Enter
  fi
}

# ─── статус ───────────────────────────────────────────────────────────────────

show_status() {
  echo ""
  echo "=== pc-remote — статус сервисов ==="

  if container_healthy "pc-remote-db"; then
    ok "PostgreSQL   (docker: pc-remote-db)"
  else
    fail "PostgreSQL   не запущен"
  fi

  if port_listening 3000; then
    ok "Backend      (порт 3000)"
  else
    fail "Backend      не запущен"
  fi

  # агент не держит порт — ищем процесс tsx в каталоге agent
  if pgrep -f "apps/agent" &>/dev/null; then
    ok "Agent        (процесс найден)"
  else
    fail "Agent        не запущен"
  fi

  if port_listening 4040; then
    ok "ngrok        (web UI на :4040)"
  else
    warn "ngrok        не запущен (запусти вручную: ngrok http 3000)"
  fi

  # tmux-сессия
  if tmux has-session -t "$SESSION" 2>/dev/null; then
    echo ""
    echo "  tmux-сессия '$SESSION':"
    tmux list-windows -t "$SESSION" 2>/dev/null | sed 's/^/    /'
    echo ""
    echo "  Подключиться: tmux attach -t $SESSION"
    echo "  Окна: Ctrl+B, затем цифра (0=main 1=db 2=backend 3=agent)"
  fi
  echo ""
}

# ─── остановка ────────────────────────────────────────────────────────────────

stop_all() {
  echo "Останавливаю сервисы..."
  if tmux has-session -t "$SESSION" 2>/dev/null; then
    tmux kill-session -t "$SESSION"
    ok "tmux-сессия '$SESSION' закрыта"
  fi
  if docker ps --filter "name=pc-remote-db" --format "{{.Names}}" 2>/dev/null | grep -q pc-remote-db; then
    docker-compose -f "$ROOT/docker-compose.yml" down
    ok "Docker-контейнеры остановлены"
  fi
  echo "Готово."
}

# ─── запуск сервисов ──────────────────────────────────────────────────────────

start_db() {
  if container_healthy "pc-remote-db"; then
    ok "PostgreSQL уже запущен"
    return
  fi
  warn "Запускаю PostgreSQL..."
  docker-compose -f "$ROOT/docker-compose.yml" up -d
  # ждём healthy
  local i=0
  while ! container_healthy "pc-remote-db" && (( i < 15 )); do
    sleep 1; (( i++ ))
  done
  if container_healthy "pc-remote-db"; then
    ok "PostgreSQL запущен"
  else
    fail "PostgreSQL не стартовал за 15 сек — проверь: docker-compose logs db"
    exit 1
  fi
}

start_backend() {
  if port_listening 3000; then
    ok "Backend уже запущен (порт 3000)"
    return
  fi
  tmux_start "backend" "$ROOT/apps/backend" "pnpm dev"
  # ждём порта
  local i=0
  while ! port_listening 3000 && (( i < 20 )); do
    sleep 1; (( i++ ))
  done
  if port_listening 3000; then
    ok "Backend запущен"
  else
    fail "Backend не поднялся за 20 сек — см. tmux attach -t $SESSION:backend"
  fi
}

start_agent() {
  if pgrep -f "apps/agent" &>/dev/null; then
    ok "Agent уже запущен"
    return
  fi
  tmux_start "agent" "$ROOT/apps/agent" "pnpm dev"
  sleep 2
  if pgrep -f "apps/agent" &>/dev/null; then
    ok "Agent запущен"
  else
    warn "Agent запущен (проверь: tmux attach -t $SESSION:agent)"
  fi
}

# ─── main ─────────────────────────────────────────────────────────────────────

case "${1:-start}" in
  status)
    show_status
    ;;
  stop)
    stop_all
    ;;
  start|"")
    echo ""
    echo "=== pc-remote — запуск сервисов ==="
    start_db
    start_backend
    start_agent
    echo ""
    show_status
    ;;
  *)
    echo "Использование: $0 [start|status|stop]"
    exit 1
    ;;
esac
