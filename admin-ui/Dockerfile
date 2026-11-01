# Nebula DNS Admin UI Dockerfile
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
#
# Build from repository root:
#   docker build -f admin-ui/Dockerfile -t nebula-dns-admin-ui .

# Development stage (docker-compose mounts ./admin-ui at /app)
FROM node:20-alpine AS development

WORKDIR /app

COPY admin-ui/package*.json ./

CMD npm install && npm run dev

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app/admin-ui

COPY admin-ui/package*.json ./
RUN npm ci --legacy-peer-deps

COPY admin-ui/ ./
COPY shared/ /app/shared/

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/admin-ui/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/admin-ui/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/admin-ui/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
