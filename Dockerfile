# Build stage
FROM node:20-alpine3.21 AS buildstage

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

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