# Build stage
FROM node:20-alpine3.21 AS buildstage

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Accept build arguments
ARG VITE_API_BASE_URL=/api
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_ENABLE_MARKER_CLUSTERING=false
ARG VITE_CLUSTER_BY_TYPE=false

# Set as environment variables for Vite to pick up
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}
ENV VITE_ENABLE_MARKER_CLUSTERING=${VITE_ENABLE_MARKER_CLUSTERING}
ENV VITE_CLUSTER_BY_TYPE=${VITE_CLUSTER_BY_TYPE}

# Copy all files (needed for postinstall script)
COPY . .

# Install dependencies with pnpm
RUN pnpm install --frozen-lockfile

# Build the application
RUN pnpm run build

# Production stage
FROM nginx:stable-alpine AS productionstage

# Copy built files from build stage
COPY --from=buildstage /app/dist /app

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]