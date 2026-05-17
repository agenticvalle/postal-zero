FROM node:20-alpine AS builder

WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
RUN npm ci --production

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma

RUN addgroup -S app && adduser -S app -G app
USER app
ENV NODE_ENV=production

EXPOSE 3000
CMD ["node", "dist/index.js"]
