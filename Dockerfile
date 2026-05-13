# syntax=docker/dockerfile:1

FROM node:20-alpine AS dependencies
WORKDIR /app
COPY services/catalog-service/package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY services/catalog-service/ ./
COPY contracts ./contracts
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY services/catalog-service/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/contracts ./contracts

EXPOSE 8082 9092

USER appuser
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
