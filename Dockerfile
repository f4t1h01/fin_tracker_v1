ARG APP_NAME

FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

FROM base AS deps

ARG APP_NAME

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/bot/package.json apps/bot/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/types/package.json packages/types/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS build

ARG APP_NAME
ARG NEXT_PUBLIC_API_URL=""
ARG NEXT_PUBLIC_TELEGRAM_BOT_NAME=""

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_TELEGRAM_BOT_NAME=$NEXT_PUBLIC_TELEGRAM_BOT_NAME

COPY . .

RUN pnpm --filter @repo/db prisma:generate
RUN pnpm --filter @repo/types build && pnpm --filter @repo/config build && pnpm --filter @repo/db build
RUN pnpm --filter "@app/${APP_NAME}" build

FROM base AS api-runtime

RUN apt-get update -y \
  && apt-get install -y openssl python3 python3-pip \
  && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/bot/package.json apps/bot/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/types/package.json packages/types/package.json

RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/packages/config/dist packages/config/dist
COPY --from=build /app/packages/types/dist packages/types/dist
COPY --from=build /app/packages/db/dist packages/db/dist
COPY --from=build /app/packages/db/prisma packages/db/prisma
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/scripts/receipt_preprocess.py apps/api/scripts/receipt_preprocess.py
COPY --from=build /app/apps/api/scripts/receipt_preprocess_requirements.txt apps/api/scripts/receipt_preprocess_requirements.txt

RUN python3 -m pip install --no-cache-dir --break-system-packages -r /app/apps/api/scripts/receipt_preprocess_requirements.txt \
  && pnpm --filter @repo/db prisma:generate

ENV NODE_ENV=production

CMD ["node", "apps/api/dist/main.js"]

FROM base AS bot-runtime

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/bot/package.json apps/bot/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/types/package.json packages/types/package.json

RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/packages/config/dist packages/config/dist
COPY --from=build /app/apps/bot/dist apps/bot/dist

ENV NODE_ENV=production

CMD ["node", "apps/bot/dist/index.js"]

FROM base AS web-runtime

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static

CMD ["node", "apps/web/server.js"]

FROM ${APP_NAME}-runtime AS runtime
