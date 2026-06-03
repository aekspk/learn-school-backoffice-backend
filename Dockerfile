#DEV stage
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json ./
COPY pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm prisma generate
RUN pnpm run build

FROM node:20-alpine AS runner

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

RUN npm install -g pnpm

COPY package.json ./
COPY pnpm-lock.yaml ./

RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist

CMD ["node", "dist/main"]
