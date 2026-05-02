FROM node:20-alpine

RUN corepack enable

WORKDIR /app

# Copy workspace manifests so pnpm can resolve the monorepo
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/game-server/package.json ./apps/game-server/
COPY apps/api-server/package.json ./apps/api-server/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --filter @nebula-dominion/web --prod

COPY apps/web ./apps/web

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "apps/web/src/server.js"]
