#!/bin/bash

# Discord Trading Signal Collector - 自动化部署脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/logs/app.log"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Discord Trading Signal Collector - 部署脚本"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

COMMAND=${1:-help}

case "$COMMAND" in
  restart)
    echo "【重启应用】"
    pkill -f "node src/index.js" 2>/dev/null || true
    sleep 2
    cd "$PROJECT_DIR"
    NODE_ENV=development nohup node src/index.js > "$LOG_FILE" 2>&1 &
    sleep 3
    echo "✅ 应用已重启"
    ;;

  stop)
    echo "【停止应用】"
    pkill -f "node src/index.js" 2>/dev/null || true
    echo "✅ 应用已停止"
    ;;

  start)
    echo "【启动应用】"
    cd "$PROJECT_DIR"
    NODE_ENV=development nohup node src/index.js > "$LOG_FILE" 2>&1 &
    sleep 3
    echo "✅ 应用已启动"
    ;;

  clean-data)
    echo "【清除所有数据】"
    docker exec discord-collector-db psql -U postgres -d discord_collector << SQL
DELETE FROM positions;
DELETE FROM signals;
DELETE FROM messages;
DELETE FROM events;
SQL
    echo "✅ 数据已清除"
    ;;

  clean-positions)
    echo "【清除持仓数据】"
    docker exec discord-collector-db psql -U postgres -d discord_collector -c \
      "DELETE FROM positions;"
    echo "✅ 持仓已清除"
    ;;

  status)
    echo "【系统状态】"
    pgrep -f "node src/index.js" > /dev/null && echo "✅ 应用运行中" || echo "❌ 应用未运行"
    curl -s http://localhost:3000/api/v1/health > /dev/null 2>&1 && echo "✅ API 正常" || echo "❌ API 未响应"
    docker exec discord-collector-db pg_isready > /dev/null 2>&1 && echo "✅ 数据库正常" || echo "❌ 数据库异常"
    ;;

  logs)
    echo "【实时日志】"
    tail -f "$LOG_FILE"
    ;;

  *)
    echo "用法："
    echo "  ./deploy.sh restart         - 重启应用"
    echo "  ./deploy.sh stop            - 停止应用"
    echo "  ./deploy.sh start           - 启动应用"
    echo "  ./deploy.sh status          - 查看系统状态"
    echo "  ./deploy.sh logs            - 查看实时日志"
    echo "  ./deploy.sh clean-data      - 清除所有数据"
    echo "  ./deploy.sh clean-positions - 清除持仓数据"
    ;;
esac
