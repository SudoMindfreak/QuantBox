# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY quantbox-core/package*.json ./quantbox-core/
COPY quantbox-server/package*.json ./quantbox-server/

# Install dependencies
RUN npm install

# Copy source code
COPY quantbox-core/ ./quantbox-core/
COPY quantbox-server/ ./quantbox-server/

# Build core and server
RUN npm run build --workspace=quantbox-core
RUN npm run build --workspace=quantbox-server

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy everything from builder to preserve hoisted binaries and workspace structure
COPY --from=builder /app ./

EXPOSE 3001

# Run from the root to ensure workspace hoisting works correctly
CMD ["npm", "run", "start", "--workspace=quantbox-server"]