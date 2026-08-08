# Self-host Sovereign Command (TanStack Start + Nitro node-server)
# Build: docker compose build
# Run:   docker compose up
FROM oven/bun:1.3-alpine AS deps
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

FROM deps AS build
WORKDIR /app
COPY . .
ENV NITRO_PRESET=node-server
RUN bun run build:selfhost

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
# Official node image user is uid/gid 1000 — matches kind deploy securityContext
COPY --from=build --chown=node:node /app/.output ./.output
USER node
EXPOSE 3000
# Nitro node-server entry
CMD ["node", ".output/server/index.mjs"]
