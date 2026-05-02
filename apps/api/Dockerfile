# ---- Builder stage ----
FROM node:20-alpine AS builder

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace manifests for dependency installation
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --frozen-lockfile

# Copy source and build
COPY apps/api ./apps/api

RUN pnpm --filter @nebula-dominion/api run build

# ---- Production image ----
FROM node:20-alpine AS runner

ENV NODE_ENV=production

RUN apk add --no-cache netcat-openbsd

RUN npm install -g pnpm@9

WORKDIR /app

# Install production dependencies only
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --prod --frozen-lockfile

# Copy built artefacts
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy entrypoint
COPY apps/api/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/health/live || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "apps/api/dist/main"]
