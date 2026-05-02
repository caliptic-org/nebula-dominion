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

COPY apps/api-server ./apps/api-server

RUN pnpm --filter @nebula-dominion/api-server run build

# Create a standalone deploy with flat node_modules (prod only)
RUN pnpm --filter @nebula-dominion/api-server deploy --prod /standalone

FROM node:20-alpine AS runner

ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /standalone/node_modules ./node_modules
COPY --from=builder /standalone/dist ./dist
COPY --from=builder /standalone/package.json ./

EXPOSE 3002

CMD ["node", "dist/main"]
