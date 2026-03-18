# Discord Trading Signal Collector - 系统设计文档

## 📋 目录
1. [系统概述](#系统概述)
2. [架构设计](#架构设计)
3. [数据流](#数据流)
4. [模块设计](#模块设计)
5. [API 接口](#api-接口)
6. [错误处理与告警](#错误处理与告警)
7. [测试策略](#测试策略)

---

## 系统概述

### 目标
构建一个 7×24 小时稳定运行的 Discord 消息收集系统，能够：
- ✅ 实时爬取指定 Discord 频道/用户的所有消息（近 30 天）
- ✅ 解析交易信号（直接指令和多消息关联分析）
- ✅ 提取和标准化仓位信息
- ✅ 通过 REST API 开放给跟单服务
- ✅ 提供完整的错误恢复和告警机制

### 核心特性
- **7×24 稳定运行**：心跳检测 + 自动重连
- **消息可靠性**：去重、排序、持久化
- **信号识别**：多种格式识别（指令 + 分析文本 + 图片）
- **错误告警**：Discord 断连 → Telegram 实时通知
- **仓位管理**：标准化存储 + 实时更新
- **可观测性**：详细日志 + 健康检查端点

---

## 架构设计

### 系统整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Discord Servers                         │
│  [Channel A] [Channel B] [User Messages]                   │
└──────────────────┬──────────────────────────────────────────┘
                   │ Discord.js Bot
                   ▼
┌─────────────────────────────────────────────────────────────┐
│        Discord Collector Service (Main Process)             │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Message Fetcher (消息获取)                          │  │
│  │ - 定时同步近 30 天消息                              │  │
│  │ - 去重机制 (message_id + timestamp)                 │  │
│  │ - 增量更新                                          │  │
│  └──────────────────┬──────────────────────────────────┘  │
│                     ▼                                       │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Signal Parser (信号解析)                            │  │
│  │ - 指令识别 (open/close/tp/sl)                       │  │
│  │ - 多消息聚合 (analysis + meta)                      │  │
│  │ - 图片 OCR (Python 子进程)                          │  │
│  └──────────────────┬──────────────────────────────────┘  │
│                     ▼                                       │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Position Manager (仓位管理)                         │  │
│  │ - 仓位状态机 (pending → open → closed)              │  │
│  │ - 实时更新                                          │  │
│  │ - 数据验证                                          │  │
│  └──────────────────┬──────────────────────────────────┘  │
│                     ▼                                       │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Database Layer (数据持久化)                         │  │
│  │ - SQLite / PostgreSQL                               │  │
│  │ - 消息表、仓位表、事件日志表                        │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │                           │
          ▼                           ▼
    ┌──────────────┐          ┌──────────────────┐
    │ REST API     │          │ Health Monitor   │
    │ (GET /api)   │          │ + Heartbeat      │
    │              │          │                  │
    │ 开放给跟单   │          │ Telegram Alert   │
    │ 服务         │          │                  │
    └──────────────┘          └──────────────────┘
```

---

## 核心模块及职责

| 模块 | 职责 | 关键方法 |
|------|------|--------|
| **DiscordCollector** | 消息获取、连接管理 | connect(), onMessageCreate(), syncMessages() |
| **SignalParser** | 信号识别、文本/图片解析 | parseMessage(), detectCommand(), ocrImage() |
| **PositionManager** | 仓位状态管理、数据一致性 | createPosition(), updatePosition(), closePosition() |
| **DatabaseService** | 数据持久化与查询 | insertMessage(), queryPositions(), saveSignal() |
| **RestAPI** | 数据查询接口 | GET /api/v1/positions, /traders, /health |
| **HealthMonitor** | 健康检查、告警 | checkHealth(), alertIfUnhealthy() |

---

## 数据流

### 消息收集 → 信号识别 → 仓位管理

```
[Discord Message] 
  ↓
[Message Fetcher] → 去重检查 → [消息保存到 DB]
  ↓
[Signal Parser] → 识别信号类型 → [保存到 signals 表]
  ↓
[Position Manager] → 状态转移 → [保存到 positions 表]
  ↓
[REST API] ← 跟单服务查询
```

### 仓位状态机

```
PENDING → OPEN → CLOSED
  ↑       ↓     ↓
  └─ UPDATE (追加、TP/SL 调整)
      CANCELLED (取消)
```

---

## 数据表设计

### messages 表
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,           -- discord message_id
  discord_user_id TEXT,          -- 发送者
  channel_id TEXT,               -- 频道
  content TEXT,                  -- 消息内容
  attachments JSONB,             -- 附件
  created_at TIMESTAMP,
  fetched_at TIMESTAMP,
  parsed BOOLEAN DEFAULT false,
  UNIQUE(id, channel_id)
);
```

### signals 表
```sql
CREATE TABLE signals (
  id TEXT PRIMARY KEY,
  message_ids JSONB,
  type TEXT,                     -- direct_command | multi_message | image_ocr
  trader TEXT,
  symbol TEXT,
  action TEXT,                   -- open | close | update
  entry DECIMAL,
  size DECIMAL,
  tp JSONB,
  sl JSONB,
  confidence FLOAT,              -- 置信度 0-1
  created_at TIMESTAMP
);
```

### positions 表
```sql
CREATE TABLE positions (
  id TEXT PRIMARY KEY,
  trader TEXT,
  symbol TEXT,
  status TEXT,                   -- pending | open | closed
  entry DECIMAL,
  size DECIMAL,
  tp JSONB,
  sl JSONB,
  opened_at TIMESTAMP,
  closed_at TIMESTAMP,
  exit DECIMAL,
  pnl DECIMAL,
  metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(id)
);

CREATE INDEX idx_positions_trader_status ON positions(trader, status);
```

### events 表（审计日志）
```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  event_type TEXT,               -- message_fetched | signal_parsed | position_updated
  entity_type TEXT,              -- position | signal | message
  entity_id TEXT,
  data JSONB,
  error JSONB,
  timestamp TIMESTAMP
);
```

---

## REST API 设计

### 核心端点

```
# 查询仓位
GET /api/v1/positions?trader=user_id&status=open&limit=10
Response: {
  positions: [{id, trader, symbol, entry, size, tp, sl, opened_at}],
  total: 42
}

# 查询单个仓位
GET /api/v1/positions/:id
Response: {position: {...}, related_signals: [...]}

# 交易者统计
GET /api/v1/traders/:trader_id
Response: {
  stats: {total_positions, win_rate, total_pnl, avg_trade},
  recent_positions: [...]
}

# 健康检查
GET /api/v1/health
Response: {
  status: "ok",
  discord_connected: true,
  db_connected: true,
  last_message_timestamp: "...",
  uptime_seconds: 86400
}
```

---

## 错误处理与告警

### 告警触发条件

| 条件 | 告警方式 | 处理 |
|------|---------|------|
| Discord 连接断开 | Telegram | 自动重连（指数退避） |
| 数据库不可用 | Telegram + 日志 | 自动重试 + 人工介入 |
| 信号解析失败 | 日志 + 统计 | 失败队列，人工审查 |
| 仓位数据不一致 | Telegram | 触发数据验证 |

### 重连策略（指数退避）
```
尝试 1: 1 秒后重试
尝试 2: 2 秒后重试
尝试 3: 4 秒后重试
...
尝试 N: min(2^(N-1), 300) 秒

若 10 次均失败 → 紧急告警
```

---

## 测试策略

### 1. 单元测试 (Jest)
- SignalParser: 各种信号格式识别准确率
- PositionManager: 状态机转移逻辑
- Database: CRUD 操作
- API: 各端点业务逻辑

### 2. 集成测试
在自己的测试 Discord 服务器上：
```
1. 发送标准指令消息 → 验证识别
2. 发送多消息分析 → 验证聚合
3. 上传交易截图 → 验证 OCR
4. 验证信号保存到 DB
5. 验证 API 返回正确数据
6. 模拟 Discord 断连 → 验证告警和重连
```

### 3. E2E 测试（月度运行）
完整的消息收集、解析、仓位管理、API 查询流程验证

---

## 部署与运维

### Docker Compose
```yaml
version: '3'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DISCORD_BOT_TOKEN=xxx
      - DATABASE_URL=postgresql://db:5432/trading
      - TELEGRAM_BOT_TOKEN=xxx
    depends_on:
      - db
  
  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=trading
      - POSTGRES_PASSWORD=xxx
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  db_data:
```

### 监控指标
- Discord 消息接收速率 (msg/min)
- 信号识别成功率 (%)
- API 响应延迟 (ms)
- 错误率 (%) 及趋势
- 数据库连接池状态

---

## 后续扩展

1. **多来源支持**：Telegram group, Twitter, 微博
2. **ML 信号识别**：提升自动识别准确率
3. **WebSocket 推送**：实时推送给跟单服务
4. **风险指标**：VaR, Sharpe Ratio 等
5. **信号评分**：基于历史准确率评分
