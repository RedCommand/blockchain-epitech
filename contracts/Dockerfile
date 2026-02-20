# Use Node.js LTS (Alpine)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code (hardhat config, contracts, scripts)
COPY . .

# Expose port for Hardhat Node
EXPOSE 8545

# Default command: Start Hardhat Node
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]
