# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY quantbox-core/package*.json ./quantbox-core/
COPY quantbox-ui/package*.json ./quantbox-ui/

# Install dependencies
RUN npm install

# Copy source code
COPY quantbox-core/ ./quantbox-core/
COPY quantbox-ui/ ./quantbox-ui/

# Set environment variables for build
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build core and ui
RUN npm run build --workspace=quantbox-core
RUN npm run build --workspace=quantbox-ui

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy everything from builder to preserve hoisted binaries and workspace structure
COPY --from=builder /app ./

EXPOSE 3000

# Run from the root to ensure workspace hoisting works correctly
CMD ["npm", "run", "start", "--workspace=quantbox-ui"]