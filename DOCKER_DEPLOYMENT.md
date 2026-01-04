# TMN Admin Template - Docker Deployment Guide

## Overview

This guide explains how to build and deploy the TMN Admin Template using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose (optional, for easier deployment)

## Quick Start

### Method 1: Using Docker Commands

#### Build the Docker Image

```bash
docker build -t tmn-admin-template:latest .
```

#### Run the Container

```bash
docker run -d -p 8080:80 --name tmn-admin-frontend tmn-admin-template:latest
```

#### Access the Application

Open your browser and navigate to:
```
http://localhost:8080
```

#### Stop and Remove the Container

```bash
docker stop tmn-admin-frontend
docker rm tmn-admin-frontend
```

### Method 2: Using Docker Compose (Recommended)

#### Start the Application

```bash
docker-compose up -d
```

#### Stop the Application

```bash
docker-compose down
```

#### Rebuild and Start

```bash
docker-compose up -d --build
```

#### View Logs

```bash
docker-compose logs -f tmn-admin-frontend
```

## Docker Image Details

- **Base Images:**
  - Build: `node:20-alpine3.21` (with pnpm)
  - Production: `nginx:stable-alpine`
  
- **Final Image Size:** ~80MB

- **Exposed Port:** 80 (mapped to 8080 on host by default)

## Configuration

### Change Port

To use a different port, modify the port mapping:

**Docker Command:**
```bash
docker run -d -p 3000:80 --name tmn-admin-frontend tmn-admin-template:latest
```

**Docker Compose:**
Edit `docker-compose.yml` and change the ports section:
```yaml
ports:
  - "3000:80"
```

### Environment Variables

If you need to add environment variables, modify the docker-compose.yml:

```yaml
environment:
  - VITE_API_URL=https://api.example.com
  - VITE_APP_NAME=TMN
```

## Production Deployment

### Building for Production

```bash
# Build the image with a specific tag
docker build -t tmn-admin-template:v1.0.0 .

# Tag for your registry
docker tag tmn-admin-template:v1.0.0 your-registry.com/tmn-admin-template:v1.0.0

# Push to registry
docker push your-registry.com/tmn-admin-template:v1.0.0
```

### Deploy to Production Server

1. Pull the image on your production server:
```bash
docker pull your-registry.com/tmn-admin-template:v1.0.0
```

2. Run the container:
```bash
docker run -d \
  -p 80:80 \
  --name tmn-admin-frontend \
  --restart unless-stopped \
  your-registry.com/tmn-admin-template:v1.0.0
```

## Nginx Configuration

The application uses a custom nginx configuration located in `nginx.conf`. The configuration:

- Serves static files from `/app/`
- Enables SPA routing with `try_files`
- Listens on port 80
- Includes proper MIME types
- Enables sendfile for better performance

## Troubleshooting

### Build Fails

If the build fails, check:
- Docker is running
- You have sufficient disk space
- Your internet connection is stable (for downloading dependencies)

### Container Doesn't Start

Check container logs:
```bash
docker logs tmn-admin-frontend
```

### Port Already in Use

If you get a "port already allocated" error, either:
- Stop the service using that port
- Use a different port (see Configuration section)

### Check Running Containers

```bash
docker ps
```

### Inspect Container

```bash
docker inspect tmn-admin-frontend
```

## Development vs Production

### Development
For development, continue using:
```bash
pnpm dev
```

### Production
Use Docker for production deployments to ensure:
- Consistent environment
- Optimized build
- Easy scaling
- Better security

## Files

- **Dockerfile** - Multi-stage build configuration
- **docker-compose.yml** - Docker Compose configuration
- **nginx.conf** - Nginx web server configuration
- **.dockerignore** - Files excluded from Docker build

## Support

For issues or questions, contact your TMN administrator.

