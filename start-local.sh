#!/bin/bash

# Discord Trading Signal Collector - 本地启动脚本

echo "🚀 启动 Discord Trading Signal Collector..."
echo ""

# 检查数据库连接
echo "【步骤 1】检查数据库连接..."
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL 未设置"
  echo "默认使用: postgresql://localhost/discord_collector"
  export DATABASE_URL="postgresql://localhost/discord_collector"
fi

# 启动服务
echo "【步骤 2】启动应用服务..."
npm start

