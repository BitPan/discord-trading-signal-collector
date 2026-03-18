# Discord Trading Signal Collector

7×24 稳定运行的 Discord 交易信号收集、解析和仓位管理系统。

## 功能

- ✅ **实时消息收集**：监听指定 Discord 频道和用户的消息
- ✅ **智能信号解析**：支持直接指令、多消息分析、图片 OCR
- ✅ **仓位管理**：完整的生命周期管理（待开 → 开启 → 平仓）
- ✅ **REST API**：为跟单服务开放接口
- ✅ **故障恢复**：自动重连、Telegram 告警
- ✅ **7×24 运行**：心跳检测、优雅重启

## 快速开始

### 前置要求
- Node.js 18+
- PostgreSQL 13+
- Discord Bot Token
- Telegram Bot Token（可选，用于告警）

### 安装

```bash
git clone https://github.com/BitPan/discord-trading-signal-collector.git
cd discord-trading-signal-collector
npm install
```

### 配置

```bash
cp .env.example .env
# 编辑 .env，填入你的 tokens 和配置
```

### 启动

```bash
npm run dev        # 开发模式
npm start          # 生产模式
docker-compose up  # Docker 部署
```

### 测试

```bash
npm run test:unit        # 单元测试
npm run test:integration # 集成测试
npm run test:e2e         # E2E 测试
npm run coverage         # 覆盖率报告
```

## 文档

- [系统设计文档](./SYSTEM_DESIGN.md) - 架构和数据流
- [开发任务拆分](./TASKS.md) - 详细的开发任务和时间表
- [测试策略](./TESTING.md) - 完整的测试计划

## API 示例

```bash
# 查询所有开启的仓位
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/positions?status=open

# 查询单个交易者统计
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/traders/trader_id

# 健康检查
curl http://localhost:3000/api/v1/health
```

## 部署

### Docker Compose

```bash
docker-compose up -d
```

### Kubernetes

```bash
kubectl apply -f k8s/
```

## 架构

```
Discord Bot → Message Collector → Signal Parser → Position Manager → REST API
                                                        ↓
                                                   PostgreSQL
                                                        ↓
                                                   Trading Service
```

## 监控

系统会自动发送告警到 Telegram：
- Discord 连接断开
- 数据库连接失败
- 消息处理队列堆积
- API 响应超时

## 贡献

欢迎 Pull Requests！请确保：
- [ ] 所有测试通过
- [ ] 代码覆盖率 > 80%
- [ ] 提交前运行 `npm run lint`

## 许可证

MIT License - 详见 [LICENSE](./LICENSE)

## 联系方式

- GitHub Issues：报告 bug 或功能请求
- Discord：加入我们的社区服务器

---

**最后更新**：2026-03-18  
**维护者**：BitPan
