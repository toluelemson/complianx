FROM node:20-alpine AS builder
WORKDIR /workspace

ENV NODE_ENV=production
ARG DATABASE_URL=postgresql://complianx:complianx@localhost:5432/complianx
ENV DATABASE_URL=${DATABASE_URL}

RUN apk add --no-cache git && corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/testing/package.json ./packages/testing/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter api build

FROM node:20-alpine
WORKDIR /workspace
ENV NODE_ENV=production
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
COPY --from=builder /workspace ./
EXPOSE 8080
CMD ["node", "apps/api/dist/src/main"]
