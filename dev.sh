#!/usr/bin/env bash
# dev.sh — проверяет и запускает сервисы pc-remote
# Использует tmux: каждый сервис — отдельное окно в сессии "pcr"

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSION="pcr"

# --- Цвета и Иконки ---
if [ -t 1 ]; then
  GREEN=$'\e[0;32m'
  YELLOW=$'\e[1;33m'
  RED=$'\e[0;31m'
  BLUE=$'\e[0;34m'
  NC=$'\e[0m'
else
  GREEN=''
  YELLOW=''
  RED=''
  BLUE=''
  NC=''
fi

ICON_OK="${GREEN}✓${NC}"
ICON_FAIL="${RED}✗${NC}"
ICON_INFO="${BLUE}i${NC}"

# --- Хелперы ---
port_listening() { ss -tlnp 2>/dev/null | grep -q ":$1\\s"; }
container_running() { docker ps --filter "name=$1" --filter "status=running" --format "{{.Names}}" 2>/dev/null | grep -q "$1"; }
tmux_window_exists() { tmux list-windows -t "$SESSION" 2>/dev/null | grep -q "^[0-9]*: $1"; }

# --- Статусы сервисов ---
get_service_statuses() {
  db_status=$(container_running "pc-remote-db" && echo "$ICON_OK" || echo "$ICON_FAIL")
  adminer_status=$(port_listening 8080 && echo "$ICON_OK" || echo "$ICON_FAIL")
  backend_status=$(tmux_window_exists "backend" && echo "$ICON_OK" || echo "$ICON_FAIL")
  agent_status=$(tmux_window_exists "agent" && echo "$ICON_OK" || echo "$ICON_FAIL")
  ngrok_status=$(tmux_window_exists "ngrok" && echo "$ICON_OK" || echo "$ICON_FAIL")
}

# --- Основные функции ---

show_status() {
  get_service_statuses
  clear
  echo -e "${BLUE}=== Статус сервисов pc-remote ===${NC}\n"
  printf "%-15s %-10s %-50s\n" "СЕРВИС" "СТАТУС" "ДЕТАЛИ"
  printf -- "--------------- ---------- --------------------------------------------------\n"
  if container_running "pc-remote-db"; then printf "%-15s [%-7s] %-50s\n" "PostgreSQL" "$ICON_OK" "Docker: pc-remote-db, Port: 5432"; else printf "%-15s [%-7s] %-50s\n" "PostgreSQL" "$ICON_FAIL" "Не запущен"; fi
  if port_listening 8080; then printf "%-15s [%-7s] %-50s\n" "Adminer" "$ICON_OK" "Web UI: http://localhost:8080"; else printf "%-15s [%-7s] %-50s\n" "Adminer" "$ICON_FAIL" "Не запущен"; fi
  if tmux_window_exists "backend"; then printf "%-15s [%-7s] %-50s\n" "Backend" "$ICON_OK" "Запущен в tmux (окно 'backend')"; else printf "%-15s [%-7s] %-50s\n" "Backend" "$ICON_FAIL" "Не запущен"; fi
  if tmux_window_exists "agent"; then printf "%-15s [%-7s] %-50s\n" "Agent" "$ICON_OK" "Запущен в tmux (окно 'agent')"; else printf "%-15s [%-7s] %-50s\n" "Agent" "$ICON_FAIL" "Не запущен"; fi
  if tmux_window_exists "ngrok"; then printf "%-15s [%-7s] %-50s\n" "ngrok" "$ICON_OK" "Запущен в tmux (окно 'ngrok')"; else printf "%-15s [%-7s] %-50s\n" "ngrok" "$ICON_FAIL" "Не запущен"; fi
  echo ""
}

show_menu() {
  get_service_statuses
  clear
  
  echo -e "${BLUE}=== Панель управления pc-remote ===${NC}\n"

  printf "%-25s | %-25s | %-25s\n" "ГЛОБАЛЬНЫЕ" "BACKEND ($backend_status)" "AGENT ($agent_status)"
  printf -- "-------------------------|-------------------------|-------------------------\n"
  printf "%-25s | %-25s | %-25s\n" " 1) Запустить ВСЕ" " 4) Запустить" " 7) Запустить"
  printf "%-25s | %-25s | %-25s\n" " 2) Остановить ВСЕ" " 5) Остановить" " 8) Остановить"
  printf "%-25s | %-25s | %-25s\n" " 3) Показать статус" " 6) Смотреть логи" " 9) Смотреть логи"
  
  echo ""

  printf "%-25s | %-25s | %-25s\n" "БД ($db_status) & ADMINER ($adminer_status)" "NGROK ($ngrok_status)" "ВЫХОД"
  printf -- "-------------------------|-------------------------|-------------------------\n"
  printf "%-25s | %-25s | %-25s\n" "10) Запустить БД" "13) Запустить" "15) Выйти"
  printf "%-25s | %-25s |\n" "11) Остановить БД" "14) Остановить"
  printf "%-25s |\n" "12) Запустить Adminer"

  echo ""
  
  read -r -p "$(echo -e "${YELLOW}Выберите действие (1-15): ${NC}")" choice
  handle_choice "${choice:-}"
}

run_in_tmux() {
  local window_name="$1"
  local command="$2"

  # Если команда завершится с ошибкой, запустится `bash`, 
  # что позволит нам увидеть вывод ошибки в окне tmux.
  local diagnostic_command="$command || bash"

  # Если окно уже существует, ничего не делаем
  if tmux_window_exists "$window_name"; then
    return
  fi

  # Если сессия не существует, создаем ее с первым окном
  if ! tmux has-session -t "$SESSION" 2>/dev/null; then
    tmux new-session -d -s "$SESSION" -n "$window_name" "$diagnostic_command"
  # Иначе создаем новое окно в существующей сессии
  else
    tmux new-window -t "$SESSION" -n "$window_name" "$diagnostic_command"
  fi
}

kill_tmux_window() { if tmux_window_exists "$1"; then tmux kill-window -t "$SESSION:$1"; fi; }
attach_to_window() { tmux select-window -t "$SESSION:$1" && tmux attach -t "$SESSION"; }

handle_choice() {
  cd "$ROOT"
  local feedback=""
  case "$1" in
    1) feedback="Запускаю backend и agent..." && run_in_tmux "backend" "pnpm --filter @pc-remote/backend dev" && run_in_tmux "agent" "pnpm --filter @pc-remote/agent dev" ;; 
    2) feedback="Останавливаю все сервисы..." && kill_tmux_window "agent" && kill_tmux_window "backend" && kill_tmux_window "ngrok" ;; 
    3) show_status && read -n 1 -s -r -p "Нажмите любую клавишу для возврата в меню..." && return ;; 
    4) feedback="Запускаю backend..." && run_in_tmux "backend" "pnpm --filter @pc-remote/backend dev" ;; 
    5) feedback="Останавливаю backend..." && kill_tmux_window "backend" ;; 
    6) attach_to_window "backend" && return ;; 
    7) feedback="Запускаю agent..." && run_in_tmux "agent" "pnpm --filter @pc-remote/agent dev" ;; 
    8) feedback="Останавливаю agent..." && kill_tmux_window "agent" ;; 
    9) attach_to_window "agent" && return ;; 
    10) feedback="Запускаю БД..." && docker-compose up -d db ;; 
    11) feedback="Останавливаю БД..." && docker-compose stop db ;; 
    12) feedback="Запускаю Adminer..." && docker-compose up -d adminer ;; 
    13) feedback="Запускаю ngrok..." && run_in_tmux "ngrok" "ngrok http 3000" ;; 
    14) feedback="Останавливаю ngrok..." && kill_tmux_window "ngrok" ;; 
    15) echo -e "\nВыход..." && exit 0 ;; 
    *) feedback="${RED}Неверный выбор.${NC}" ;; 
  esac
  echo -e "\n${feedback}"
  sleep 1
}

main() {
  if ! command -v tmux &> /dev/null; then echo -e "${RED}Ошибка: tmux не установлен.${NC}" && exit 1; fi
  if ! command -v docker-compose &> /dev/null; then echo -e "${RED}Ошибка: docker-compose не найден.${NC}" && exit 1; fi
  while true; do show_menu; done
}

main "$@"
