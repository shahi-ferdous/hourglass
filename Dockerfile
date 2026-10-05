# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- deps: install once, reused by the builder stage ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: compiles the app; keeps full node_modules (incl. devDeps) ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# A DATABASE_URL isn't needed to build (drizzle.config.ts is only used by
# the CLI, not by `next build`), but keep the var defined so nothing that
# imports src/lib/env.ts at build time explodes if it's ever touched.
ENV DATABASE_URL=postgres://build:build@localhost:5432/build
RUN npm run build

# ---- migrator: one-shot service that applies Drizzle migrations ----
# Reuses the builder stage as-is (drizzle-kit is a devDependency, so this
# needs the full node_modules — the slim `runner` image below intentionally
# doesn't carry it).
FROM builder AS migrator
CMD ["npm", "run", "db:migrate"]

# ---- runner: slim production image, standalone Next.js output only ----
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Defense-in-depth alongside `outputFileTracingIncludes` in next.config.ts:
# make sure @node-rs/argon2's native binary survives the standalone trace
# regardless of how it was built.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@node-rs ./node_modules/@node-rs

USER nextjs
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["node", "server.js"]
