FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @repo/db prisma:generate
RUN pnpm --filter @repo/types build && pnpm --filter @repo/config build && pnpm --filter @repo/db build

ARG APP_NAME
ARG NEXT_PUBLIC_API_URL=""
ARG NEXT_PUBLIC_TELEGRAM_BOT_NAME=""

ENV APP_NAME=$APP_NAME
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_TELEGRAM_BOT_NAME=$NEXT_PUBLIC_TELEGRAM_BOT_NAME
RUN pnpm --filter "@app/${APP_NAME}" build

CMD ["sh", "-c", "pnpm --filter \"@app/${APP_NAME}\" start"]
