FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration and package files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/server/package.json ./packages/server/

# Install all dependencies (including dev for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the server (compiles TS and copies client files)
WORKDIR /app/packages/server
RUN pnpm run build

FROM node:20-alpine AS runner

WORKDIR /app

# Copy package.json and install only production deps directly (no monorepo needed)
COPY packages/server/package.json ./package.json
RUN npm install --omit=dev

# Copy built output and migrations from builder
COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/packages/server/migrations ./migrations

EXPOSE 3000

CMD ["node", "dist/index.js"]
