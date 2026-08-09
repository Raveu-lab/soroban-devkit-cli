# ─── Stage 1: Build soroban-devkit-core ──────────────────────────────────────
FROM node:20-alpine AS core-builder

WORKDIR /build/core

# Clone only what we need — no auth required for public repos
RUN apk add --no-cache git && \
    git clone --depth 1 https://github.com/Raveu-lab/soroban-devkit-core.git .

RUN npm install && npm run build

# ─── Stage 2: Build soroban-devkit-cli ───────────────────────────────────────
FROM node:20-alpine AS cli-builder

WORKDIR /build/cli

# Copy the built core from stage 1 so the file: dependency resolves
COPY --from=core-builder /build/core /build/soroban-devkit-core

# Copy CLI source
COPY . .

# Install deps (file:../soroban-devkit-core resolves to the copied core above)
RUN npm install && npm run build && npm test

# ─── Stage 3: Runtime image ───────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

COPY --from=cli-builder /build/cli/dist ./dist
COPY --from=cli-builder /build/cli/package.json .
COPY --from=cli-builder /build/cli/node_modules ./node_modules

# Make the binary executable
RUN chmod +x dist/cli.js

ENTRYPOINT ["node", "dist/cli.js"]
