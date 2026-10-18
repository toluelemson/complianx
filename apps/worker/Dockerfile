FROM node:22-alpine AS builder
WORKDIR /workspace

RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/worker/package.json ./apps/worker/package.json
RUN pnpm install --frozen-lockfile
COPY apps/worker ./apps/worker
RUN pnpm --filter worker build

FROM node:22-alpine
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=builder /workspace ./
EXPOSE 9850
CMD ["node", "apps/worker/dist/index.js"]
