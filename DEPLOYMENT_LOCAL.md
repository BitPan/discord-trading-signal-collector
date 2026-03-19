# 本地部署和测试指南

## 🎯 目标
在本地环境部署和测试 Discord Trading Signal Collector，验证所有组件正常工作。

## 📋 前置条件

### 1. PostgreSQL 数据库
确保本地运行着 PostgreSQL 数据库：

```bash
# macOS (Homebrew)
brew services start postgresql

# Linux
sudo systemctl start postgresql

# 验证连接
psql -U postgres
```

### 2. 创建数据库
```bash
createdb discord_collector
```

### 3. 配置环境变量
编辑 `.env` 文件：
```
DATABASE_URL=postgresql://localhost/discord_collector
NODE_ENV=development
API_PORT=3000
```

## 🚀 启动服务

### 1. 安装依赖
```bash
npm install
```

### 2. 初始化数据库
```bash
node src/scripts/initDatabase.js
```

### 3. 启动应用
```bash
npm start
```

或使用本地启动脚本：
```bash
bash start-local.sh
```

服务将在 `http://localhost:3000` 启动。

## 📝 生成测试数据

### 创建测试数据
```bash
node src/scripts/seedTestData.js
```

这会插入：
- 3 条测试消息
- 2 个测试交易员
- 3 个测试信号
- 3 个测试仓位（不同状态）

## 🌐 访问 Web UI

打开浏览器访问：
```
http://localhost:3000
```

### 页面功能

| 页面 | 功能 |
|------|------|
| 📊 仪表板 | 系统统计和最近信号 |
| 📨 消息 | Discord 消息历史 |
| 🎯 信号 | 解析的交易信号 |
| 📍 仓位 | 仓位生命周期管理 |
| 👤 交易员 | 交易员统计信息 |
| ❤️ 系统 | 系统健康状态 |

## 🧪 验证清单

### 后端 API
- [ ] `GET /api/v1/health` - 返回 200 OK
- [ ] `GET /api/v1/messages` - 返回消息列表
- [ ] `GET /api/v1/signals` - 返回信号列表
- [ ] `GET /api/v1/positions` - 返回仓位列表
- [ ] `GET /api/v1/traders` - 返回交易员列表

### 前端 UI
- [ ] 页面加载无错误
- [ ] 导航标签正常工作
- [ ] 数据表格显示测试数据
- [ ] 筛选功能正常

### 数据库
- [ ] 消息表有测试数据
- [ ] 信号表有测试数据
- [ ] 仓位表有测试数据
- [ ] 交易员表有测试数据

## 🔧 故障排除

### 问题 1: 数据库连接失败
```bash
# 检查 PostgreSQL 是否运行
psql -U postgres -d postgres -c "SELECT 1"

# 检查 .env 中的 DATABASE_URL
cat .env | grep DATABASE_URL
```

### 问题 2: 端口 3000 已被占用
```bash
# 修改 .env 中的 API_PORT
echo "API_PORT=3001" >> .env

# 或杀死占用端口的进程
lsof -i :3000
kill -9 <PID>
```

### 问题 3: 测试数据未显示
```bash
# 检查数据是否已插入
psql -U postgres -d discord_collector -c "SELECT COUNT(*) FROM messages;"

# 重新运行测试数据脚本
node src/scripts/seedTestData.js
```

## 📊 查看原始数据

### SQL 查询示例
```sql
-- 查看所有消息
SELECT id, discord_username, content, created_at FROM messages LIMIT 10;

-- 查看所有信号
SELECT id, trader, symbol, action, entry, size FROM signals;

-- 查看所有仓位
SELECT id, trader, symbol, status, entry, pnl FROM positions;

-- 查看所有交易员
SELECT id, username, total_positions, win_rate FROM traders;
```

## 📈 性能测试

### 测试 API 响应时间
```bash
# 使用 curl
time curl http://localhost:3000/api/v1/messages

# 使用 Apache Bench
ab -n 100 -c 10 http://localhost:3000/api/v1/health
```

## 🎯 下一步

验证完所有功能后，可以：

1. **继续开发** - Task 3.3-3.4 和后续任务
2. **配置真实 Discord** - 连接真实的 Discord 账户
3. **部署到服务器** - Docker 部署
4. **配置 Telegram 告警** - 完整告警功能

## 📞 获取帮助

遇到问题：
1. 查看 `logs/` 目录中的日志文件
2. 运行 `npm run test` 检查代码质量
3. 检查 `MEMORY.md` 中的故障排除记录

