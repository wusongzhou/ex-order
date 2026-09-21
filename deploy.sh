#!/bin/bash
# ex-order 一键部署脚本（本地 Windows Git Bash 运行）
# 用法:
#   ./deploy.sh          同步代码 + 远程重建 + 健康检查
#   ./deploy.sh --sync   仅同步代码，不重建（改配置文件时用）
set -e

# ===== 配置 =====
SERVER="118.25.230.23"
USER="root"
KEY="C:/collection/keys/wsz/chengdu.pem"
REMOTE_DIR="/opt/ex-order"
PORT="49632"
SSH_CMD="ssh -i $KEY -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new $USER@$SERVER"

# ===== 检查本地环境 =====
cd "$(dirname "$0")"
if [ ! -d ".git" ]; then
  echo "✗ 请在项目根目录运行"
  exit 1
fi
echo "==> 本地代码状态:"
git log --oneline -1
git status --short | head -5
if [ -n "$(git status --short)" ]; then
  echo "⚠ 工作区有未提交改动（以上文件不会包含在 git 记录中，但会一起部署）"
fi

# ===== 1. 同步代码（排除本地专属文件，服务器上的 .env/override 不受影响）=====
echo "==> 同步代码到 $SERVER:$REMOTE_DIR ..."
tar -czf - \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git \
  --exclude=.env \
  --exclude="*.db" \
  --exclude="*.db-shm" \
  --exclude="*.db-wal" \
  --exclude="so-*" \
  . | $SSH_CMD "tar -xzf - -C $REMOTE_DIR && echo '   代码同步完成'"

if [ "$1" = "--sync" ]; then
  echo "✓ 仅同步模式完成（未重建容器）"
  exit 0
fi

# ===== 2. 远程构建并重启（数据卷不受影响）=====
echo "==> 远程构建并重启容器（约 2-4 分钟）..."
$SSH_CMD "cd $REMOTE_DIR && docker compose up -d --build" 2>&1 | tail -5

# ===== 3. 健康检查 =====
echo "==> 健康检查..."
sleep 5
CONTAINER=$($SSH_CMD "docker ps --filter name=ex-order --format '{{.Status}}'")
if [ -z "$CONTAINER" ]; then
  echo "✗ 容器未运行！最近日志："
  $SSH_CMD "docker logs ex-order --tail 20" 2>&1
  exit 1
fi
echo "   容器状态: $CONTAINER"

HTTP=$($SSH_CMD "curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/admin/login")
if [ "$HTTP" != "200" ]; then
  echo "✗ 健康检查失败（HTTP $HTTP），最近日志："
  $SSH_CMD "docker logs ex-order --tail 20" 2>&1
  exit 1
fi
echo "   服务响应: HTTP $HTTP"

echo ""
echo "✓ 部署完成  $REMOTE_DIR → http://$SERVER:$PORT （验证接口均正常）"
