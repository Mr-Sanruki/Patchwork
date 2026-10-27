FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci --ignore-scripts

# Copy source
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY demo-repos/ ./demo-repos/
COPY .env.example ./

# Build frontend
RUN npm run build -w frontend

# Build backend
RUN npm run build -w backend 2>/dev/null || true

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Install only production deps
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
RUN npm ci --omit=dev --ignore-scripts 2>/dev/null || npm install --omit=dev --ignore-scripts

# Copy built assets
COPY --from=base /app/frontend/dist ./frontend/dist
COPY --from=base /app/backend/src ./backend/src
COPY --from=base /app/demo-repos ./demo-repos
COPY --from=base /app/.env.example ./.env.example

# Runtime setup
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
ENV DATABASE_PATH=./data/patchwork.db

EXPOSE 3001

# Use tsx to run TypeScript directly
RUN npm install -g tsx

CMD ["tsx", "backend/src/index.ts"]
