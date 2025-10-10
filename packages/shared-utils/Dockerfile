# BitPesa Shared Utils Service
# Refactored to use base template and best practices

ARG SERVICE_NAME=shared-utils
ARG PORT=3007

# Use base template
FROM base AS builder

# Build shared types first (dependency)
RUN pnpm --filter @bitpesa/shared-types build

# Build shared utils
RUN pnpm --filter @bitpesa/shared-utils build

# Production image
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=${PORT}

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared-utils/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared-utils/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared-types/dist ./packages/shared-types/dist

USER nestjs

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

EXPOSE ${PORT}

CMD ["node", "dist/index.js"]
