#!/usr/bin/env bash
# 🧪 PC Remote — Скрипт для запуска всех тестов
# Использование: ./run-tests.sh

set -e

echo "📱 PC Remote — Тестирование"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Цвета
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Проверка pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm не установлен. Установите: npm install -g pnpm${NC}"
    exit 1
fi

echo -e "${BLUE}✓${NC} pnpm версия: $(pnpm --version)"

# Проверка Docker (опционально для backend)
if command -v docker &> /dev/null; then
    echo -e "${BLUE}✓${NC} Docker доступен"
else
    echo -e "${YELLOW}⚠${NC} Docker не установлен (требуется для backend тестов)"
fi

cd "$(dirname "$0")"

echo ""
echo -e "${BLUE}📦 Установка зависимостей...${NC}"
pnpm install --frozen-lockfile

echo ""
echo -e "${BLUE}📱 Тестирование Mobile приложения...${NC}"
pnpm --filter mobile test -- --coverage=false --passWithNoTests
MOBILE_STATUS=$?

echo ""
echo -e "${BLUE}🖥️  Тестирование Agent...${NC}"
pnpm --filter agent test -- --run
AGENT_STATUS=$?

echo ""
echo -e "${BLUE}🔧 Тестирование Backend...${NC}"
echo -e "${YELLOW}⚠${NC}  Backend требует запущенной PostgreSQL."
echo -e "${YELLOW}   ${NC}Запустите: docker compose up -d"
echo ""
echo -e "${YELLOW}? Запустить backend тесты? (y/n)${NC}"
read -r RESPONSE
if [ "$RESPONSE" = "y" ]; then
    pnpm --filter backend test -- --run
    BACKEND_STATUS=$?
else
    echo -e "${YELLOW}⊘${NC} Backend тесты пропущены"
    BACKEND_STATUS=0
fi

# Итоги
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 ИТОГИ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $MOBILE_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Mobile: PASS"
else
    echo -e "${RED}✗${NC} Mobile: FAIL"
fi

if [ $AGENT_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Agent: PASS"
else
    echo -e "${RED}✗${NC} Agent: FAIL"
fi

if [ $BACKEND_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Backend: PASS"
else
    echo -e "${RED}✗${NC} Backend: FAIL"
fi

echo ""

# Финальный статус
if [ $MOBILE_STATUS -eq 0 ] && [ $AGENT_STATUS -eq 0 ] && [ $BACKEND_STATUS -eq 0 ]; then
    echo -e "${GREEN}🎉 ВСЕ ТЕСТЫ ПРОШЛИ!${NC}"
    exit 0
else
    echo -e "${RED}❌ НЕКОТОРЫЕ ТЕСТЫ НЕ ПРОШЛИ${NC}"
    exit 1
fi
