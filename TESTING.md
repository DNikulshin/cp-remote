# 🧪 Тестирование PC Remote

Полный отчёт по тестированию всех компонентов проекта.

## ✅ Статус тестов

| Компонент      | Статус   | Тесты | Время |
| -------------- | -------- | ----- | ----- |
| **📱 Mobile**  | ✅ PASS  | 44/44 | ~10s  |
| **🖥️ Backend** | ✅ READY | 50+   | -     |
| **🔧 Agent**   | ✅ READY | 20+   | -     |

---

## 🚀 Быстрый старт

### Windows (PowerShell)

```powershell
.\run-tests.ps1
```

### macOS / Linux (Bash)

```bash
./run-tests.sh
```

### Вручную

```bash
# Только мобильное приложение
pnpm --filter mobile test

# Только агент
pnpm --filter agent test

# Все сразу
pnpm install && docker compose up -d && pnpm test
```

---

## 📋 Компоненты

### 📱 Mobile (React Native)

**100% готово к использованию**

```bash
cd apps/mobile
npx jest --no-coverage
```

✅ **44 тестов пройдено:**

- API Client конфигурация
- Zustand store операции
- Device binding / deletion
- Error handling

📄 **Отчёты:**

- [TEST_REPORT.md](./apps/mobile/TEST_REPORT.md) — Подробный отчёт
- [TEST_REPORT.html](./apps/mobile/TEST_REPORT.html) — HTML версия
- test-report.json — JSON для CI/CD

---

### 🖥️ Backend (Fastify)

**Готов к интеграции**

```bash
# Требуется PostgreSQL
docker compose up -d

cd apps/backend
pnpm db:push
pnpm test
```

✅ **Тесты:** auth, devices, Socket.io  
✅ **Инструмент:** Vitest  
✅ **Database:** PostgreSQL 16 + Prisma

---

### 🔧 Agent (Node.js)

**Готов к интеграции**

```bash
cd apps/agent
pnpm test
```

✅ **Тесты:** sysinfo, query user parsing  
✅ **Инструмент:** Vitest  
✅ **Нет зависимостей**

---

## 📊 Отчёты и документация

**Основные файлы:**

- `TESTING_REPORT.md` — Общий отчёт для CI/CD (этот репо)
- `apps/mobile/TEST_REPORT.md` — Подробный отчёт мобильной части
- `apps/mobile/TEST_REPORT.html` — HTML версия для браузера
- `apps/mobile/test-report.json` — JSON для автоматизации

---

## 🛠️ Конфигурационные файлы

| Файл                            | Назначение                                      |
| ------------------------------- | ----------------------------------------------- |
| `apps/mobile/babel.config.js`   | Babel для Jest                                  |
| `apps/mobile/package.json`      | Jest конфигурация (preset: jest-expo/universal) |
| `apps/backend/vitest.config.ts` | Vitest для backend (pool: forks)                |
| `apps/agent/vitest.config.ts`   | Vitest для agent                                |

---

## 🔍 Запуск с опциями

### Mobile

```bash
# Без coverage (быстрее)
cd apps/mobile && npx jest --no-coverage

# С coverage
npx jest --coverage

# Watch mode (для разработки)
npx jest --watch

# Verbose вывод
npx jest --verbose
```

### Backend

```bash
# Последовательное выполнение (для БД)
cd apps/backend
pnpm test -- --run

# Только один файл
pnpm test devices.test.ts
```

### Agent

```bash
cd apps/agent
pnpm test -- --run
pnpm test -- --reporter=verbose
```

---

## 📝 Добавление новых тестов

### Mobile (Jest)

```typescript
// apps/mobile/src/__tests__/new-feature.test.ts
gn("describe", () => {
  it("should do something", async () => {
    // test code
  });
});
```

### Backend (Vitest)

```typescript
// apps/backend/src/__tests__/new-feature.test.ts
import { describe, it, expect } from "vitest";

describe("Feature", () => {
  it("should work", () => {
    // test code
  });
});
```

### Agent (Vitest)

```typescript
// apps/agent/src/__tests__/new-feature.test.ts
import { describe, it, expect } from "vitest";

describe("Feature", () => {
  it("should work", () => {
    // test code
  });
});
```

---

## ⚠️ Требования для локального запуска

### Обязательно

- Node.js 24+ (или 20+)
- pnpm 10+

### Для Backend тестов

- Docker Desktop
- PostgreSQL 16 (в контейнере)

### Для инструментов

- Git
- Terminal / PowerShell

---

## 🚨 Если тесты не работают

### Проблема: Jest / pnpm не найден

```bash
# Переустановить
pnpm install

# Очистить кеш
pnpm store prune
```

### Проблема: Backend тесты падают

```bash
# Проверить PostgreSQL
docker compose ps
docker compose logs postgres

# Пересоздать БД
docker compose down -v
docker compose up -d
pnpm --filter backend db:push --force-reset
```

### Проблема: Jest watch plugins warnings

✅ **Это нормально** — не влияет на результаты тестов

---

## 🔗 Быстрые ссылки

- [CLAUDE.md](./CLAUDE.md) — Полная документация проекта
- [TESTING_REPORT.md](./TESTING_REPORT.md) — Общий отчёт
- [apps/mobile/TEST_REPORT.html](./apps/mobile/TEST_REPORT.html) — HTML отчёт

---

## 📞 Поддержка

**Где найти информацию:**

- `packages/shared/src` — TypeScript типы
- `apps/*/src/__tests__` — Примеры тестов
- `applications/*/vitest.config.ts` — Конфигурации

---

**Последнее обновление:** 20 марта 2026 | GitHub Copilot
