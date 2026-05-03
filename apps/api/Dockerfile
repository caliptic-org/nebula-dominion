FROM node:20-alpine AS builder

RUN corepack enable

WORKDIR /app

# Copy workspace manifests so pnpm can resolve the monorepo
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/game-server/package.json ./apps/game-server/
COPY apps/api-server/package.json ./apps/api-server/
COPY apps/web/package.json ./apps/web/

RUN pnpm install

COPY apps/api ./apps/api
COPY apps/api/nest-cli.json ./nest-cli.json

RUN pnpm --filter @nebula-dominion/api run build

RUN pnpm --filter @nebula-dominion/api deploy --prod /standalone

FROM node:20-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /standalone/node_modules ./node_modules
COPY --from=builder /standalone/dist ./dist
COPY --from=builder /standalone/package.json ./package.json

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/health || exit 1

CMD ["node", "dist/main"]
