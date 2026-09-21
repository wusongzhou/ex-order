FROM node:20-alpine

# openssl: Prisma 引擎依赖; tzdata + TZ: 保证截止时间按北京时间处理
RUN apk add --no-cache openssl tzdata
ENV TZ=Asia/Shanghai

WORKDIR /app

# 先复制依赖清单，利用 Docker 层缓存
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

# SQLite 数据目录（挂载卷持久化）
RUN mkdir -p /app/data
ENV NODE_ENV=production
ENV DATABASE_URL="file:../data/app.db"

EXPOSE 3000
VOLUME /app/data

# 启动时自动同步表结构，然后启动服务
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm start -- -H 0.0.0.0 -p ${PORT:-3000}"]
