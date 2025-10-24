# Legal Form Application - Node.js Express Server Container
# Optimized for Google Cloud Run deployment
# Production-ready configuration with minimal attack surface

FROM node:20-alpine

# Set working directory for application
WORKDIR /app

# Copy package manifests (package.json and package-lock.json if available)
# Uses wildcards to safely handle both files
COPY package*.json ./

# Install production dependencies only
# Uses 'npm ci' for deterministic builds (reproducible, secure)
# --only=production excludes devDependencies (e.g., test frameworks)
RUN npm ci --only=production

# Copy entire application source code to container
COPY . .

# Expose port 8080 (Cloud Run standard port)
# Cloud Run automatically routes traffic to this port
EXPOSE 8080

# Start Node.js application
# Using server.js as main entry point (monolithic server with email feature)
# Note: server/index.js refactoring is incomplete - requires form-routes.js
CMD ["node", "server.js"]
