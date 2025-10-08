# Multi-stage build for BitPesa Monitoring Service
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/shared-config/package.json ./packages/shared-config/
COPY services/monitoring-service/package.json ./services/monitoring-service/

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build shared packages
RUN pnpm --filter @bitpesa/shared-types build
RUN pnpm --filter @bitpesa/shared-utils build
RUN pnpm --filter @bitpesa/shared-config build

# Build monitoring service
RUN pnpm --filter @bitpesa/monitoring-service build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3004

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/services/monitoring-service/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/services/monitoring-service/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared-utils/dist ./packages/shared-utils/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared-config/dist ./packages/shared-config/dist

USER nestjs

EXPOSE 3004

ENV PORT=3004

CMD ["node", "dist/main.js"]
