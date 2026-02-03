# Stage 1: Build frontend
FROM node:20-alpine AS builder

# Optional: pin npm version to match lockfile
RUN npm install -g npm@10.8.2

WORKDIR /app

# Copy lockfile first to leverage Docker cache
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy all source code
COPY . .

# Build Next.js
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine AS production

WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Install only production dependencies
RUN npm ci --omit=dev

EXPOSE 3000

CMD ["npm", "start"]
