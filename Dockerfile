ARG NODE_IMAGE=node:22-alpine3.21

FROM ${NODE_IMAGE} AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable \
	&& apk add --no-cache openssl ca-certificates libc6-compat \
	&& apk upgrade --no-cache

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @workspace/database generate
RUN pnpm build --filter api_v2

FROM ${NODE_IMAGE} AS runner

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
ENV PORT=8000

RUN corepack enable \
	&& apk add --no-cache openssl ca-certificates \
	&& apk upgrade --no-cache

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api_v2/package.json ./apps/api_v2/package.json
COPY packages/brand-theme/package.json ./packages/brand-theme/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/forms-core/package.json ./packages/forms-core/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/widgets-core/package.json ./packages/widgets-core/package.json

RUN pnpm install --prod --frozen-lockfile --filter api_v2... --ignore-scripts

COPY --from=builder /app/apps/api_v2/dist ./apps/api_v2/dist
COPY --from=builder /app/packages/brand-theme/dist ./packages/brand-theme/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/packages/database/prisma.config.ts ./packages/database/prisma.config.ts
COPY --from=builder /app/packages/forms-core/dist ./packages/forms-core/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/widgets-core/dist ./packages/widgets-core/dist
COPY --from=builder /app/apps/api_v2/package.json ./apps/api_v2/package.json
COPY --from=builder /app/packages/brand-theme/package.json ./packages/brand-theme/package.json
COPY --from=builder /app/packages/database/package.json ./packages/database/package.json
COPY --from=builder /app/packages/forms-core/package.json ./packages/forms-core/package.json
COPY --from=builder /app/packages/types/package.json ./packages/types/package.json
COPY --from=builder /app/packages/widgets-core/package.json ./packages/widgets-core/package.json

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
	CMD wget -qO- "http://127.0.0.1:${PORT}/health" | grep -q '"status":"ok"' || exit 1

CMD ["pnpm", "--filter", "api_v2", "run", "start:prod"]
