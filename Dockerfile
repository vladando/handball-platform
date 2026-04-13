# ─────────────────────────────────────────────────────────────────
# Multi-stage Dockerfile — Next.js
# Stage 1: deps        install production node_modules
# Stage 2: builder     build the Next.js app
# Stage 3: runner      minimal production image
# ─────────────────────────────────────────────────────────────────

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma client at build time
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public        ./public
COPY --from=builder /app/.next/standalone  .
COPY --from=builder /app/.next/static  ./.next/static
COPY --from=builder /app/prisma        ./prisma

# Run DB migrations then start the server
COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENTRYPOINT ["/entrypoint.sh"]
