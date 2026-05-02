FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ─── Stage 1: Install dependencies ────────────────────────────────────────
FROM base AS deps
# Install libc6-compat for native modules on Alpine
RUN apk add --no-cache libc6-compat

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml* ./
COPY apps/web/package.json ./apps/web/

# Install only production-relevant deps (prune dev later at runtime)
RUN pnpm install --frozen-lockfile --filter @nebula-dominion/web...

# ─── Stage 2: Build ────────────────────────────────────────────────────────
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy application source
COPY apps/web ./apps/web

WORKDIR /app/apps/web

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# ─── Stage 3: Production runner ───────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4000
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4000/ || exit 1

CMD ["node", "apps/web/server.js"]
