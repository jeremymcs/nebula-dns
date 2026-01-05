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

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=build /app/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "dist/src/main"]
