# ---------- 依赖层 ----------
FROM node:20-alpine AS deps
# 国内镜像加速：alpine 源 + npm 源
RUN sed -i 's#dl-cdn.alpinelinux.org#mirrors.cloud.tencent.com#g' /etc/apk/repositories \
    && apk add --no-cache openssl tzdata
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm config set registry https://registry.npmmirror.com && npm ci

# ---------- 构建层 ----------
FROM node:20-alpine AS builder
RUN sed -i 's#dl-cdn.alpinelinux.org#mirrors.cloud.tencent.com#g' /etc/apk/repositories \
    && apk add --no-cache openssl tzdata
ENV TZ=Asia/Shanghai NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm config set registry https://registry.npmmirror.com && npx prisma generate && npm run build

# ---------- 运行层（仅含 standalone 产物 + Prisma 运行时） ----------
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl tzdata
ENV TZ=Asia/Shanghai NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=49632
WORKDIR /app

# Next.js standalone 产物（含按需追踪的最小 node_modules）
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma：schema + 引擎 + CLI（启动时 db push 用）
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# WAL 初始化脚本
COPY scripts/wal.cjs ./scripts/wal.cjs

# SQLite 数据目录（挂载卷持久化）
RUN mkdir -p /app/data
# connection_limit=1：单连接串行化写操作，配合 WAL 避免 database is locked
ENV DATABASE_URL="file:../data/app.db?connection_limit=1&socket_timeout=15"

EXPOSE 49632
VOLUME /app/data

# 启动：同步表结构（直接调用 prisma CLI 入口，绕过 npx）→ 开启 WAL → 启动 standalone 服务
CMD ["sh", "-c", "node node_modules/prisma/build/index.js db push --skip-generate && node scripts/wal.cjs && node server.js"]
