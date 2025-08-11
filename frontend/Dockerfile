FROM oven/bun:1.1.21

WORKDIR /app

# Install curl, Node.js (for npx) and basic tools
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

# Copy only package manifests first to leverage Docker layer caching
COPY package.json bun.lockb* ./

# Install dependencies (will run again at container start in dev for volume-mount safety)
RUN bun install

# Copy the rest of the app source
COPY . .

EXPOSE 5173

# Default command; docker compose overrides with bun install + dev
CMD ["bun", "run", "dev", "--host", "0.0.0.0", "--port", "5173"]
