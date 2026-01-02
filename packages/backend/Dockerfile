# Backend Dockerfile
FROM node:18-alpine AS base

WORKDIR /app

# Install dependencies for the entire monorepo
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
RUN npm install

# Copy backend source
COPY packages/backend ./packages/backend
COPY tsconfig.json ./

# Build backend
RUN npm run build:backend

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy only production dependencies
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
RUN npm ci --only=production --workspace=packages/backend

# Copy built files
COPY --from=base /app/packages/backend/dist ./packages/backend/dist

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "packages/backend/dist/index.js"]
