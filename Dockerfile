FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @repo/db prisma:generate

ARG APP_NAME
ENV APP_NAME=$APP_NAME
RUN pnpm --filter "@app/${APP_NAME}" build

CMD ["sh", "-c", "pnpm --filter \"@app/${APP_NAME}\" start"]
