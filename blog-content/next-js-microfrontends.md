# Building Server Side Rendered Micro Frontends

## Initialize NextJS Project

```sh
npx create-next-app@latest product-app
```

## Install Module Federation Plugin

```sh
pnpm add @module-federation/nextjs-mf
```

Next, we need to configure `next.config.ts` to use module federation

```typescript
import type { NextConfig } from "next";
import withModuleFederation from "@module-federation/nextjs-mf"

const nextConfig: NextConfig = new withModuleFederation({
  name: 'product',
  filename: 'static/chunks/remoteEntry.js',
  exposes: {
    './ProductApp': './src/app/layout.tsx', // expose the root layout
  },
  shared: {
    react: { singleton: true },
    'react-dom': { singleton: true },
  },
  extraOptions: {
  },
});

// Make sure to add this for docker build
nextConfig.output = 'standalone';

export default nextConfig;  
```

## Docker Image

```dockerfile
# syntax=docker.io/docker/dockerfile:1

FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi 

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN rm -rf /app/.next/server/app/sitemap.xml.*

USER nextjs

EXPOSE 80

ENV PORT=80

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

Now deploy your micro-app. Next, we will prepare the main micro frontend: 

## Changing nextjs configuration of the main micro frontend

In the main app, the one that will "host" the micro frontend, we will modify the `next.config.ts` to include the new app: 


```typescript
import withModuleFederation from '@module-federation/nextjs-mf';

const isServer = typeof window === 'undefined';

export default withModuleFederation({
  name: 'main',
  remotes: {
    product: isServer
      ? 'product@http://localhost:3001/_next/static/chunks/remoteEntry.js' // SSR
      : 'product@http://localhost:3001/_next/static/chunks/remoteEntry.js', // Client
  },
  shared: {
    react: { singleton: true, eager: true },
    'react-dom': { singleton: true, eager: true },
  },
});
```

Now the `localhost` may vary from localhost to remote, so you may want to define an environment variable to manage the URL better: 

```typescript
import withModuleFederation from '@module-federation/nextjs-mf';

const isServer = typeof window === 'undefined';

// Access env variable, fallback if not set
const productRemoteUrl = process.env.NEXT_PUBLIC_PRODUCT_REMOTE_URL || 'http://localhost:3001/_next/static/chunks/remoteEntry.js';

export default withModuleFederation({
  name: 'main',
  remotes: {
    product: isServer
      ? `product@${productRemoteUrl}` // SSR
      : `product@${productRemoteUrl}`, // Client
  },
  shared: {
    react: { singleton: true, eager: true },
    'react-dom': { singleton: true, eager: true },
  },
});
```