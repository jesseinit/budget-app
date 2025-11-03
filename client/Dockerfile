# Production build
FROM node:22.17-alpine

WORKDIR /code

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build for production
RUN npm run build

# Install serve to run the production build
RUN npm install -g serve

# Copy env script
COPY env.sh /code/env.sh
RUN chmod +x /code/env.sh


EXPOSE 80

# Use env.sh to inject runtime config and start server
CMD ["/code/env.sh"]
