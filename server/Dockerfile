FROM node:20-alpine

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Copy application source
COPY . .

# Switch to non-root user
USER appuser

EXPOSE 5000

CMD ["npm", "run", "start"]
