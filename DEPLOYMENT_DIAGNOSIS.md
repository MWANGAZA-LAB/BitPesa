# BitPesa Bridge - Deployment Issues Diagnosis & Fix

## 🔍 Current Issues Identified

### 1. **GitHub Pages Deployment Issues**
- **Missing GitHub Pages Workflow**: No dedicated workflow for GitHub Pages deployment
- **Next.js Configuration**: Current config not optimized for static export
- **Missing Static Export**: GitHub Pages requires static site generation

### 2. **GitHub Workflows Issues**
- **Missing Dockerfiles**: Several services lack Dockerfiles referenced in workflows
- **Build Failures**: TypeScript compilation errors in shared infrastructure
- **Missing Dependencies**: ESLint configuration issues
- **Service References**: Workflows reference non-existent services

### 3. **Build System Issues**
- **Shared Infrastructure**: Cache and resilience services not building properly
- **TypeScript Errors**: Import/export issues in performance monitoring
- **Missing Dependencies**: Redis and NestJS config dependencies

## 🛠️ Fixes Required

### 1. Create GitHub Pages Workflow
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: '8.10.0'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build web app
        run: |
          cd apps/web
          pnpm build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: apps/web/out

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### 2. Fix Next.js Configuration for GitHub Pages
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath: process.env.NODE_ENV === 'production' ? '/BitPesa' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/BitPesa/' : '',
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Remove rewrites for static export
  // async rewrites() {
  //   return [
  //     {
  //       source: '/api/:path*',
  //       destination: 'http://localhost:8000/api/:path*',
  //     },
  //   ];
  // },
};

module.exports = nextConfig;
```

### 3. Create Missing Dockerfiles
```dockerfile
# services/api-gateway/Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN corepack enable pnpm && pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 4. Fix Shared Infrastructure Build Issues
```typescript
// packages/shared-infrastructure/src/index.ts
// Database exports
export { PrismaService } from './database/prisma.service';

// Cache exports
export { RedisService } from './cache/redis.service';

// Resilience exports
export { 
  CircuitBreakerService, 
  RetryService, 
  RateLimitService 
} from './resilience/resilience.service';

// Module export
export { SharedInfrastructureModule } from './shared-infrastructure.module';

// Types
export type { PrismaConfig } from './database/prisma.service';
export type { RedisConfig, CacheOptions } from './cache/redis.service';
export type { CircuitBreakerConfig, CircuitBreakerState } from './resilience/resilience.service';
```

### 5. Update Package.json Scripts
```json
{
  "scripts": {
    "build": "turbo run build",
    "build:web": "cd apps/web && pnpm build",
    "build:static": "cd apps/web && pnpm build && pnpm export",
    "deploy:pages": "cd apps/web && pnpm build && pnpm export",
    "docker:build": "docker build -t bitpesa/web apps/web/",
    "docker:build:all": "docker-compose build"
  }
}
```

## 🚀 Implementation Steps

### Step 1: Fix Build Issues
1. Install missing dependencies
2. Fix TypeScript compilation errors
3. Build shared infrastructure package
4. Fix import/export issues

### Step 2: Create Missing Files
1. Create GitHub Pages workflow
2. Create missing Dockerfiles
3. Update Next.js configuration
4. Fix package.json scripts

### Step 3: Test Deployment
1. Test local build
2. Test GitHub Pages deployment
3. Test Docker builds
4. Verify all workflows

## 📊 Expected Results

### GitHub Pages
- ✅ Static site deployment working
- ✅ Proper routing and asset loading
- ✅ Performance optimized build

### GitHub Workflows
- ✅ All CI/CD pipelines passing
- ✅ Docker builds successful
- ✅ Proper service deployment

### Build System
- ✅ All TypeScript compilation successful
- ✅ No linting errors
- ✅ All dependencies resolved

## 🔧 Quick Fix Commands

```bash
# Fix dependencies
pnpm install

# Build shared infrastructure
cd packages/shared-infrastructure && pnpm build

# Test web build
cd apps/web && pnpm build

# Test Docker build
docker build -t bitpesa/web apps/web/

# Run linting
pnpm lint --fix
```

## 📝 Next Steps

1. **Immediate**: Fix build errors and missing dependencies
2. **Short-term**: Create GitHub Pages workflow and missing Dockerfiles
3. **Medium-term**: Optimize deployment pipeline and add monitoring
4. **Long-term**: Implement advanced CI/CD features and automated testing

This diagnosis provides a comprehensive overview of the deployment issues and the steps needed to resolve them.
