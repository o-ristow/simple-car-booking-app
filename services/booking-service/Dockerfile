FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Expose gRPC port
EXPOSE 50052

# Start the service
CMD ["node", "server.js"]
