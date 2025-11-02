# Production build
FROM node:22.17-alpine

WORKDIR /code

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build for production
RUN npm run build

# Install serve to run the production build
RUN npm install -g serve

EXPOSE 80

# Serve the built app
CMD ["serve", "-s", "dist", "-l", "80"]