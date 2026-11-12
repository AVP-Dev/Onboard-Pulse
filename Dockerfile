# 1. Base stage with Node 22 (includes native node:sqlite DatabaseSync)
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# 2. Dependencies stage
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# 3. Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 4. Production Runner stage
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_PATH=/app/data/pulse.db

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/src ./src
COPY --from=builder /app/data ./data
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Persistent volume for SQLite database
VOLUME ["/app/data"]

EXPOSE 3000

# Start production server
CMD ["sh", "-c", "if [ ! -f /app/data/pulse.db ]; then npm run db:seed; fi && npm run start"]
