#!/bin/bash
set -e

echo "🐳 Docker 部署启动脚本"
echo ""

# 创建数据目录
echo "【步骤 1】创建数据目录..."
mkdir -p ./data/postgres
mkdir -p ./logs

# 创建 .env 文件（如果不存在）
if [ ! -f .env ]; then
  echo "【步骤 2】创建 .env 文件..."
  cp .env.example .env 2>/dev/null || cat > .env << 'ENVEOF'
NODE_ENV=production
API_PORT=3000
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/discord_collector
DISCORD_USER_TOKEN=${DISCORD_USER_TOKEN}
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}
ENVEOF
  echo "⚠️  已创建 .env，请根据需要编辑"
fi

# 启动 Docker Compose
echo "【步骤 3】启动 Docker Compose..."
docker-compose up -d

# 等待服务启动
echo "【步骤 4】等待服务启动..."
sleep 5

# 检查数据库连接
echo "【步骤 5】检查数据库连接..."
for i in {1..10}; do
  if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ 数据库已连接"
    break
  fi
  if [ $i -eq 10 ]; then
    echo "❌ 数据库连接失败"
    exit 1
  fi
  echo "等待数据库... ($i/10)"
  sleep 2
done

# 生成测试数据（可选）
read -p "生成测试数据？ (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "【步骤 6】生成测试数据..."
  docker-compose exec -T app node src/scripts/seedTestData.js || echo "⚠️  测试数据生成失败，可能已存在"
fi

# 显示服务状态
echo ""
echo "【步骤 7】服务状态"
docker-compose ps

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 服务已启动！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 访问地址："
echo "  Web UI：http://localhost:3000"
echo "  API：http://localhost:3000/api/v1/health"
echo ""
echo "📊 数据库信息："
echo "  Host: localhost:5432"
echo "  User: postgres"
echo "  Password: postgres"
echo "  Database: discord_collector"
echo ""
echo "📁 数据存储："
echo "  - 数据库：./data/postgres"
echo "  - 日志：./logs"
echo ""
echo "🔧 常用命令："
echo "  docker-compose ps              # 查看服务状态"
echo "  docker-compose logs app        # 查看应用日志"
echo "  docker-compose logs postgres   # 查看数据库日志"
echo "  docker-compose down            # 停止服务"
echo "  docker-compose restart app     # 重启应用"
echo ""
