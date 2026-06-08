FROM node:20-alpine AS builder

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/game-server/package.json ./apps/game-server/
COPY apps/api-server/package.json ./apps/api-server/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --filter @nebula-dominion/web

COPY apps/web ./apps/web

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time.
# They must be declared as ARG and promoted to ENV before `next build` runs.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GAME_SERVER_URL
ARG NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_FB_PIXEL_ID
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_ENV
ARG NEXT_PUBLIC_SENTRY_RELEASE
# NEXT_PUBLIC_GAME_SPEED_MULTIPLIER mirrors the backend GAME_SPEED_MULTIPLIER
# so the FE catalog/detail labels render the same scaled duration as the
# server already applies to deadlines. MUST be a build ARG, not just env,
# because Next.js standalone bakes NEXT_PUBLIC_* at build time — restarting
# the container won't pick it up; only a rebuild does.
ARG NEXT_PUBLIC_GAME_SPEED_MULTIPLIER=1
# Guild backend is live (game-server /api/guilds/*, GuildsModule mounted). The
# FE guildApi gates on this flag; without it baked true the prod bundle served
# hardcoded stub guilds (cycle-27 audit GUILD-BACKEND-FEATURE-FLAG-DISABLED).
# Default true so the real backend is used unless a build explicitly opts out.
ARG NEXT_PUBLIC_GUILD_BACKEND_READY=true
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GAME_SERVER_URL=$NEXT_PUBLIC_GAME_SERVER_URL
ENV NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID
ENV NEXT_PUBLIC_FB_PIXEL_ID=$NEXT_PUBLIC_FB_PIXEL_ID
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_ENV=$NEXT_PUBLIC_SENTRY_ENV
ENV NEXT_PUBLIC_SENTRY_RELEASE=$NEXT_PUBLIC_SENTRY_RELEASE
ENV NEXT_PUBLIC_GAME_SPEED_MULTIPLIER=$NEXT_PUBLIC_GAME_SPEED_MULTIPLIER
ENV NEXT_PUBLIC_GUILD_BACKEND_READY=$NEXT_PUBLIC_GUILD_BACKEND_READY

RUN pnpm --filter @nebula-dominion/web run build

FROM node:20-alpine AS production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=builder --chown=appuser:appgroup /app/apps/web/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=appuser:appgroup /app/apps/web/public ./apps/web/public

USER appuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "apps/web/server.js"]
