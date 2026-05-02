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

COPY apps/game-server ./apps/game-server

RUN pnpm --filter @nebula-dominion/game-server run build || true
RUN test -f /app/apps/game-server/dist/main.js || (echo "Build failed: dist/main.js not found" && exit 1)

# Create a standalone deploy with flat node_modules (prod only)
RUN pnpm --filter @nebula-dominion/game-server deploy --prod /standalone

FROM node:20-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /standalone/node_modules ./node_modules
COPY --from=builder /standalone/dist ./dist
COPY --from=builder /standalone/package.json ./package.json

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health/live || exit 1

CMD ["node", "dist/main"]
