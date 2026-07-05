<<<<<<< Updated upstream
# Build stage
FROM node:26-slim AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    python3 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src/ src/
COPY scripts/ scripts/
COPY assets/ assets/
# No build step needed since we use tsx in CMD, but we could compile to JS if we wanted.
# For simplicity with the existing structure, we'll keep it as TS.

# Final stage
=======
>>>>>>> Stashed changes
FROM node:26-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    fonts-liberation \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN python3 -m pip install --no-cache-dir edge-tts --break-system-packages
RUN corepack enable && corepack prepare pnpm@10 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY assets ./assets
COPY .env.example ./

RUN mkdir -p assets/backgrounds assets/music assets/fonts assets/logo temp_assets/jobs output && \
    chown -R node:node /app
RUN fc-cache -f -v

USER node

ENV NODE_ENV=production

CMD ["pnpm", "run", "start"]
