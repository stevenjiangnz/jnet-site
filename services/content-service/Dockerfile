FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY ./src ./src

EXPOSE 3000

CMD ["node", "src/index.js"]