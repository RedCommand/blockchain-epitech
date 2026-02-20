# Use Node.js LTS (Alpine)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (no dev deps excluded, as dev mode needs them)
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start command (Use dev for dynamic local chain config support)
CMD ["npm", "run", "dev"]
