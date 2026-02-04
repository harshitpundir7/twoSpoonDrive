# Use Node.js 20 LTS as base image
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js app
# Provide placeholder DATABASE_URL for build time (Next.js needs it for static generation)
ENV NEXT_TELEMETRY_DISABLED 1
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install netcat for database connection check
RUN apk add --no-cache netcat-openbsd

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma

# Fix ownership of generated files for nextjs user
RUN chown -R nextjs:nodejs /app/generated /app/prisma

# Install Prisma CLI for running migrations in entrypoint
# Copy package.json first, then install Prisma
COPY --from=builder /app/package.json ./package.json
RUN npm install --no-save prisma@^7.2.0

# Fix ownership of node_modules created by npm install
RUN chown -R nextjs:nodejs /app/node_modules

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Use entrypoint script to run migrations and start the app
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]

