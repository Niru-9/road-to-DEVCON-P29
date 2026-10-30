# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Build stage. better-sqlite3 ships native bindings, so keep a compiler
# toolchain available for platforms without a prebuilt binary.
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build \
 && npm prune --omit=dev \
 && npm cache clean --force

# ---------------------------------------------------------------------------
# Runtime stage. No compilers, no dev dependencies, no source.
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3001 \
    DATABASE_PATH=/app/data/qf.db

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# The SQLite database and its WAL files live on a volume.
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3001/health || exit 1

CMD ["node", "dist/index.js"]
