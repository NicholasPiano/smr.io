# Build stage
FROM oven/bun:1.1.21 as builder

WORKDIR /app

# Install curl, Node.js (for npx) and basic tools
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

# Copy only package manifests first to leverage Docker layer caching
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install

# Copy the rest of the app source
COPY . .

# Build for production
ARG NODE_ENV=development
ARG VITE_API_URL=http://localhost:8000/api
RUN if [ "$NODE_ENV" = "production" ]; then \
      bun run build; \
    fi

# Development stage
FROM oven/bun:1.1.21 as development

WORKDIR /app

# Install curl, Node.js (for npx) and basic tools
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

EXPOSE 5173

# Default development command
CMD ["bun", "run", "dev", "--host", "0.0.0.0", "--port", "5173"]

# Production stage
FROM nginx:alpine as production

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config if needed
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
