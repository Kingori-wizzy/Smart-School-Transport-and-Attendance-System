FROM node:20-bullseye

WORKDIR /app

# Install system dependencies (only essential build tools)
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies (TensorFlow will use pure JS version)
RUN npm install

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Start the server with nodemon for development
CMD ["npm", "run", "dev"]