# Frontend Dockerfile
FROM node:18-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY packages/frontend/package*.json ./packages/frontend/
RUN npm install

# Copy source
COPY packages/frontend ./packages/frontend
COPY tsconfig.json ./

# Build frontend
RUN npm run build:frontend

# Production stage with nginx
FROM nginx:alpine

# Copy built files
COPY --from=build /app/packages/frontend/dist /usr/share/nginx/html

# Copy nginx config
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
