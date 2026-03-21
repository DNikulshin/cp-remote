FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@9

WORKDIR /app

# Копируем манифесты для кэширования слоёв
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

RUN pnpm install --frozen-lockfile

# Копируем исходники
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Сборка shared + backend (включает prisma generate)
RUN pnpm --filter @pc-remote/shared build
RUN pnpm --filter backend build

EXPOSE 3000

CMD ["sh", "-c", "pnpm --filter backend start"]
