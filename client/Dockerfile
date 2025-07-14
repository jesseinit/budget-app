# Use a lightweight Node.js image
FROM node:22.17-alpine

# Set working directory
WORKDIR /code

# Remove lock and node_modules if present
RUN rm -rf node_modules package-lock.json

# Copy package.json and package-lock.json (if available)
COPY package.json ./
# If you have a lock file, uncomment the next line
# COPY package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app
COPY . .

EXPOSE 5173

# Start the app in dev mode
CMD ["npm", "run", "dev"]