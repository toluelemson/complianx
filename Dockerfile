FROM node:20-alpine AS builder
WORKDIR /workspace

ENV NODE_ENV=production
ENV NPM_CONFIG_PRODUCTION=false
ARG DATABASE_URL=postgresql://aicd:aicd@localhost:5432/aicd
ENV DATABASE_URL=${DATABASE_URL}

RUN apk add --no-cache git

COPY backend/package*.json ./backend/
COPY backend/package-lock.json ./backend/

WORKDIR /workspace/backend
RUN npm install

# Copy rest of the backend sources
COPY backend .

RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY --from=builder /workspace/backend/node_modules ./node_modules
COPY --from=builder /workspace/backend/dist ./dist
COPY --from=builder /workspace/backend/prisma ./prisma

EXPOSE 8080

CMD ["node", "dist/main"]
