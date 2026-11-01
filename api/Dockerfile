# Nebula DNS API Dockerfile
# Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>

# Development stage
FROM node:20-alpine AS development

WORKDIR /app

# Install nest CLI globally for development
RUN npm install -g @nestjs/cli

# Only copy package files initially - source will be mounted as volume
COPY package*.json ./

# Install deps and start dev server
CMD npm install && npm run start:dev

# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache su-exec

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=build /app/dist ./dist

RUN mkdir -p /app/uploads/block-pages && chown -R node:node /app/uploads

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/main"]
