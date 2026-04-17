# Build stage
FROM node:24-slim AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install build dependencies if needed
# (None specifically needed for this TS project, but good to have)

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
# No build step needed since we use tsx in CMD, but we could compile to JS if we wanted.
# For simplicity with the existing structure, we'll keep it as TS.

# Final stage
FROM node:24-slim

WORKDIR /app

# Install production dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    fonts-liberation \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install edge-tts via pip (required for src/tts.service.ts)
RUN python3 -m pip install edge-tts --break-system-packages

# Habilitar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app ./

# Setup folders and fix permissions
RUN mkdir -p assets/backgrounds assets/music assets/fonts assets/logo temp_assets output && \
    chown -R node:node /app
    
# Ensure fonts are available for FFmpeg
RUN fc-cache -f -v

USER node

ENV NODE_ENV=production

# The CronJob will override CMD if needed, but we set a default
CMD ["pnpm", "run", "generate"]
