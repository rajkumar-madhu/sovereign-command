# ── Sovereign Command — production image ─────────────────────────────────────
# Multi-stage: install → build → lean Node runtime
# Build:  docker build -t sovereign-command:prod .
# Run:    docker run --rm -p 3000:3000 sovereign-command:prod

# ── deps ─────────────────────────────────────────────────────────────────────
FROM oven/bun:1.2-alpine AS deps
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

# ── build ────────────────────────────────────────────────────────────────────
FROM oven/bun:1.2-alpine AS build
WORKDIR /app
ENV NODE_ENV=production
ENV NITRO_PRESET=node-server
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# ── runtime ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

# Non-root
RUN addgroup -g 1001 -S app && adduser -u 1001 -S app -G app

COPY --from=build --chown=app:app /app/.output ./.output
COPY --from=build --chown=app:app /app/package.json ./package.json

USER app
EXPOSE 3000

# Nitro node-server listens on PORT
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ || exit 1

CMD ["node", ".output/server/index.mjs"]
