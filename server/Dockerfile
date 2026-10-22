FROM node:22-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .


RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" npm run build


FROM node:22-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app


COPY package*.json ./
RUN npm ci --omit=dev


COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma


USER node

EXPOSE 5000

CMD ["node", "dist/index.js"]