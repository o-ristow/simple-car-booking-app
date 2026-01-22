FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Expose gRPC and REST ports
EXPOSE 50053 5003

# Start the service
CMD ["node", "server.js"]
