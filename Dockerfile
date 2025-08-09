# Multi-stage Dockerfile for AI Pets Adventure
# Stage 1: Base Node.js image with dependencies
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./

# Stage 2: Dependencies installation
FROM base AS deps

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Stage 3: Development dependencies
FROM base AS dev-deps

# Install all dependencies (including dev dependencies)
RUN npm ci && npm cache clean --force

# Stage 4: Build stage
FROM base AS builder

# Copy source code
COPY . .

# Install all dependencies
RUN npm ci

# Build the application
RUN npm run build

# Stage 5: Production runtime
FROM node:18-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]

# Stage 6: Development environment
FROM dev-deps AS dev

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=development
ENV PORT=3000

# Start development server
CMD ["npm", "run", "dev"]

# Stage 7: Testing environment
FROM dev-deps AS test

# Copy source code
COPY . .

# Set environment variables
ENV NODE_ENV=test
ENV CI=true

# Run tests
CMD ["npm", "test"] 