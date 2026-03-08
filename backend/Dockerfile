FROM node:20-bullseye

WORKDIR /app

# Install build dependencies for TensorFlow
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies)
RUN npm install

# If TensorFlow fails to install, try this specific command
RUN npm install @tensorflow/tfjs-node --force

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 5000

# Use nodemon for development
CMD ["npm", "run", "dev"]