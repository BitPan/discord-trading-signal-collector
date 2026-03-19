# 跟单交易系统设计文档

## 📋 概述

支持自动跟单 Discord 交易员信号到真实交易所账户（OKX / Hyperliquid）的完整系统。

---

## 🎯 系统架构

### 核心概念

```
Discord Signal
    ↓
【信号解析】
    ↓
【仓位计算】(入场价、大小、TP/SL)
    ↓
【风险验证】(余额、杠杆、单笔限额)
    ↓
【下单执行】(OKX API / Hyperliquid API)
    ↓
【仓位跟踪】(实时同步状态)
    ↓
【平仓执行】(自动 TP/SL)
```

### 系统组件

```
┌─────────────────────────────────────┐
│   Web UI（配置面板）                │
│  • 账户配置                         │
│  • 跟单规则                         │
│  • 风险参数                         │
│  • 实时监控                         │
└────────────────────┬────────────────┘
                     │
┌────────────────────▼────────────────┐
│   CopyTradingService（核心引擎）    │
│  • 信号接收                         │
│  • 仓位计算                         │
│  • 风险验证                         │
│  • 下单执行                         │
└────────────────────┬────────────────┘
                     │
     ┌───────────────┴───────────────┐
     │                               │
┌────▼──────────┐         ┌──────────▼────┐
│  OKX Adapter  │         │Hyperliquid    │
│  • REST API   │         │  • REST API    │
│  • WebSocket  │         │  • WebSocket   │
│  • Order Mgmt │         │  • Order Mgmt  │
└────┬──────────┘         └──────────┬────┘
     │                               │
┌────▼────────────────────────────────▼────┐
│   Exchange Trading Accounts              │
│   (Actual orders, real capital)          │
└──────────────────────────────────────────┘
```

---

## 📊 核心数据模型

### 1. 跟单账户配置 (CopyTradingConfig)

```javascript
{
  id: "config_001",
  trader_id: "achen886",           // 跟单配置所有者
  
  // 账户信息
  exchange: "okx" | "hyperliquid",
  exchange_api_key: "encrypted",
  exchange_secret: "encrypted",
  exchange_passphrase: "encrypted", // OKX 特定
  
  // 跟单规则
  enabled: true,                    // 是否启用
  source_traders: ["trader_eli", "trader_john"],  // 跟单来源
  
  // 风险参数
  leverage: 2,                      // 杠杆倍数 (1-20)
  position_size_usdtper_signal: 100, // 每个信号用多少 USDT
  max_daily_pnl_loss: -500,         // 日亏损限额
  max_concurrent_positions: 5,      // 最多同时持仓数
  max_position_size_percent: 0.1,   // 单笔占总资本百分比
  
  // 价格调整
  entry_offset_percent: 0,          // 入场价格偏移（-5~5%）
  tp_offset_percent: 0,             // TP 价格偏移
  sl_offset_percent: 0,             // SL 价格偏移
  
  // 状态
  account_balance: 10000,           // 账户余额（USDT）
  account_balance_updated_at: "2026-03-19T10:00:00Z",
  
  created_at: "2026-03-19T10:00:00Z",
  updated_at: "2026-03-19T10:00:00Z"
}
```

### 2. 跟单仓位 (CopyPosition)

```javascript
{
  id: "copy_pos_001",
  config_id: "config_001",
  
  // 来源信息
  source_position_id: "pos_001",
  source_trader: "trader_eli",
  source_signal_id: "sig_001",
  
  // 交易信息
  exchange: "okx",
  symbol: "BTC-USDT",              // 交易对
  order_type: "market" | "limit",  // 订单类型
  side: "long" | "short",          // 方向
  entry: 45000,                    // 入场价
  exit: null,                       // 平仓价
  size: 0.1,                        // 仓位大小（BTC）
  size_usdt: 4500,                  // 名义价值
  
  // 交易所信息
  exchange_order_id: "12345678",    // 交易所订单 ID
  exchange_position_id: "pos_123",  // 交易所仓位 ID
  
  // TP/SL
  tp: [46000, 47000],               // 获利点
  sl: 44000,                        // 止损
  
  // 仓位状态
  status: "pending" | "open" | "closing" | "closed",
  entry_timestamp: "2026-03-19T10:00:00Z",
  exit_timestamp: null,
  
  // 收益
  pnl: null,
  pnl_percent: null,
  
  // 同步信息
  last_sync_at: "2026-03-19T10:05:00Z",
  sync_status: "synced" | "pending" | "error"
}
```

### 3. 跟单日志 (CopyTradingLog)

```javascript
{
  id: "log_001",
  config_id: "config_001",
  timestamp: "2026-03-19T10:00:00Z",
  
  event_type: "signal_received" | "position_opened" | 
              "position_closed" | "error" | "risk_check_failed",
  
  // 事件详情
  source_signal_id: "sig_001",
  copy_position_id: "copy_pos_001",
  
  // 状态
  status: "success" | "failed" | "skipped",
  error_message: null,
  
  // 详细数据
  details: {
    signal_info: {...},
    position_info: {...},
    risk_check_results: {...}
  }
}
```

---

## 🔧 工作流程

### 1. 信号来临时

```
Discord Signal (Eli: "OPEN BTCUSD 45000 0.1")
    ↓
【匹配跟单配置】
- source_traders 包含 "trader_eli"？✅
- enabled = true？✅
    ↓
【解析信号】
- Symbol: BTCUSD
- Entry: 45000
- Size: 0.1
    ↓
【计算仓位大小】
- 配置：每个信号 100 USDT
- 交易对精度调整
- 杠杆计算（如果需要）
    ↓
【风险验证】
✅ 账户余额足够？
✅ 同时持仓数不超？
✅ 日亏损未超过？
✅ 单笔大小合理？
    ↓
【价格调整】
- 考虑 entry_offset_percent
    ↓
【交易所下单】
- OKX API 或 Hyperliquid API
- 返回 order_id
    ↓
【创建 CopyPosition 记录】
- 保存交易所订单 ID
- 记录到数据库
    ↓
【发送通知】
- Telegram: "✅ 已跟单 BTC-USDT 买入 0.1"
```

### 2. 仓位管理（实时同步）

```
定时任务（每 10 秒）
    ↓
【获取所有活跃仓位】
- CopyPosition where status = 'open'
    ↓
【从交易所同步状态】
- 获取当前价格
- 获取仓位 PnL
- 检查是否被平仓
    ↓
【检查 TP/SL 触发】
- 价格 >= TP1？执行 TP
- 价格 <= SL？执行 SL
    ↓
【更新仓位状态】
- 更新 pnl、pnl_percent
- 如果已平，更新 status = 'closed'
    ↓
【发送通知】
- 如果有变化：Telegram 通知
```

### 3. 平仓逻辑

```
【自动平仓场景】

1️⃣ TP 触发
   价格 >= TP1 → 平仓 TP1 数量
   价格 >= TP2 → 平仓 TP2 数量

2️⃣ SL 触发
   价格 <= SL → 全部平仓

3️⃣ 源信号平仓
   来源仓位变为 closed → 执行平仓

4️⃣ 手动平仓
   用户在 Web UI 点击平仓按钮
```

---

## 🔐 安全性设计

### 1. 密钥管理

```javascript
// ❌ 不要这样做
config.api_key = "sk_live_abc123...";  // 明文存储！

// ✅ 这样做
const encrypted = encrypt(apiKey, masterKey);  // 加密存储
config.encrypted_api_key = encrypted;

// 解密时
const apiKey = decrypt(config.encrypted_api_key, masterKey);
```

### 2. 权限隔离

```
本地账户（你的电脑）
    ↓
主密钥（加密/解密所有 API 密钥）
    ↓
【API 密钥】（只有必要的权限）
    ├─ OKX: 交易权限 + 仓位查询
    ├─ Hyperliquid: 交易权限 + 仓位查询
    └─ 限额：IP 白名单 + 读写分离
```

### 3. 风险限制

```javascript
// 每个请求都验证
async function validateBeforeOrder(config, position) {
  // 1. 账户余额检查
  if (balance < position.required_margin) {
    throw new Error("余额不足");
  }
  
  // 2. 杠杆检查
  if (config.leverage > MAX_LEVERAGE) {
    throw new Error("杠杆过高");
  }
  
  // 3. 日亏损检查
  const today_loss = await getTodayLoss(config);
  if (today_loss < config.max_daily_pnl_loss) {
    throw new Error("日亏损已超过限额，停止交易");
  }
  
  // 4. 并发数检查
  const open_positions = await getOpenPositions(config);
  if (open_positions.length >= config.max_concurrent_positions) {
    throw new Error("同时持仓数已超过限额");
  }
  
  // 5. 单笔大小检查
  const position_percent = position.size_usdt / config.account_balance;
  if (position_percent > config.max_position_size_percent) {
    throw new Error("单笔仓位过大");
  }
  
  return true;
}
```

---

## 💻 Web UI 设计

### 页面 1: 跟单配置

```
┌─────────────────────────────────────┐
│  跟单配置                           │
├─────────────────────────────────────┤
│                                     │
│ 【基本信息】                        │
│  配置名称: My OKX Copy Trading     │
│  交易所:   OKX ▼                    │
│  状态:     ✅ 已启用                │
│                                     │
│ 【账户信息】                        │
│  API Key:     [****]                │
│  Secret:      [****]                │
│  Passphrase:  [****] (OKX)          │
│  🔗 验证连接                        │
│                                     │
│ 【跟单来源】                        │
│  选择交易员:                        │
│  ☑️  trader_eli                     │
│  ☑️  trader_john                    │
│  ☐  trader_woods                    │
│  ☐  trader_astekz                   │
│                                     │
│ 【风险参数】                        │
│  单次跟单金额 (USDT): [100]         │
│  最大杠杆倍数: [2]                  │
│  最多同时持仓: [5]                  │
│  日亏损限额 (USDT): [-500]          │
│  单笔占比限额: [10%]                │
│                                     │
│ 【价格调整】                        │
│  入场价格偏移: [0%]                 │
│  TP 偏移: [0%]                      │
│  SL 偏移: [0%]                      │
│                                     │
│ 【账户余额】                        │
│  当前余额: 10,000 USDT              │
│  同步时间: 2 分钟前                 │
│  🔄 立即刷新                        │
│                                     │
│  [保存配置]  [删除]  [测试]         │
└─────────────────────────────────────┘
```

### 页面 2: 跟单仓位

```
┌─────────────────────────────────────┐
│  跟单仓位                           │
├─────────────────────────────────────┤
│                                     │
│ 【筛选】                            │
│  配置: My OKX Copy Trading ▼        │
│  状态: 全部 ▼                       │
│                                     │
│ 【仓位列表】                        │
│                                     │
│ #1  BTC-USDT  买入  0.1 BTC         │
│     来源: trader_eli @ 2026-03-19  │
│     入场: 45000 | 当前: 45500      │
│     TP1: 46000 | TP2: 47000         │
│     SL: 44000                      │
│     PnL: +500 USDT (+1.11%)        │
│     [平仓] [编辑]                   │
│                                     │
│ #2  ETH-USDT  买入  1.0 ETH         │
│     来源: trader_john @ 2026-03-19 │
│     入场: 2500 | 当前: 2510        │
│     TP1: 2600                      │
│     SL: 2400                       │
│     PnL: +10 USDT (+0.40%)         │
│     [平仓] [编辑]                   │
│                                     │
│ 【统计】                            │
│  持仓数: 2   |  总 PnL: +510  |  胜率: 100%
│                                     │
└─────────────────────────────────────┘
```

### 页面 3: 跟单日志

```
┌─────────────────────────────────────┐
│  跟单日志                           │
├─────────────────────────────────────┤
│                                     │
│ 【筛选】                            │
│  配置: 全部 ▼  日期: 今天 ▼        │
│  事件: 全部 ▼                       │
│                                     │
│ 【事件日志】                        │
│                                     │
│ 10:05  ✅ position_opened           │
│   trader_eli 的 BTCUSD 信号         │
│   已下单: 0.1 BTC @ 45000          │
│   订单 ID: ord_12345678            │
│                                     │
│ 10:04  ⚠️  risk_check_failed        │
│   trader_woods 的信号被跳过         │
│   原因: 同时持仓数已达上限         │
│                                     │
│ 10:03  ✅ position_opened           │
│   trader_john 的 ETHUSD 信号        │
│   已下单: 1.0 ETH @ 2500           │
│                                     │
│ 10:00  ℹ️  config_updated           │
│   配置已更新: 杠杆 1x → 2x         │
│                                     │
└─────────────────────────────────────┘
```

---

## 📚 API 设计

### 配置 API

```javascript
// 获取所有配置
GET /api/v1/copy-trading/configs

// 创建配置
POST /api/v1/copy-trading/configs
{
  "exchange": "okx",
  "exchange_api_key": "...",
  "exchange_secret": "...",
  "exchange_passphrase": "...",
  "source_traders": ["trader_eli"],
  "leverage": 2,
  "position_size_usdt": 100
}

// 更新配置
PUT /api/v1/copy-trading/configs/:id
{
  "source_traders": ["trader_eli", "trader_john"],
  "leverage": 3
}

// 验证 API 连接
POST /api/v1/copy-trading/configs/:id/verify-connection

// 删除配置
DELETE /api/v1/copy-trading/configs/:id
```

### 仓位 API

```javascript
// 获取跟单仓位
GET /api/v1/copy-trading/positions?config_id=xxx&status=open

// 手动平仓
POST /api/v1/copy-trading/positions/:id/close
{
  "exit_price": 46000
}

// 获取仓位详情
GET /api/v1/copy-trading/positions/:id

// 编辑仓位（TP/SL）
PUT /api/v1/copy-trading/positions/:id
{
  "tp": [46000, 47000],
  "sl": 44000
}
```

### 日志 API

```javascript
// 获取跟单日志
GET /api/v1/copy-trading/logs?config_id=xxx&type=position_opened

// 获取统计
GET /api/v1/copy-trading/stats?config_id=xxx
```

---

## 🔗 与现有系统集成

### 数据流

```
Discord Signal (现有)
    ↓
【信号解析】(现有 SmartSignalParser)
    ↓
【仓位创建】(现有 PositionService)
    ↓
【新】分支 1: 创建本地仓位 (positions 表)
    ↓
【新】分支 2: 触发 CopyTradingService
    ├─ 匹配跟单配置
    ├─ 计算仓位大小
    ├─ 风险验证
    └─ 交易所下单
```

### 数据库表

```
新增表：
- copy_trading_configs      (跟单配置)
- copy_trading_positions    (跟单仓位)
- copy_trading_logs         (跟单日志)
- copy_trading_api_keys     (加密的 API 密钥)

修改表：
- positions                 (添加 copy_position_id 字段)
- events                    (记录跟单相关事件)
```

---

## 🏦 交易所适配

### OKX

```javascript
class OKXAdapter {
  // 认证
  authenticate(apiKey, secret, passphrase)
  
  // 账户
  getAccountBalance()
  getPositions()
  
  // 下单
  placeOrder(symbol, side, size, price)
  closePosition(positionId)
  updateTP_SL(positionId, tp, sl)
  
  // 查询
  getOrder(orderId)
  getPosition(positionId)
}
```

### Hyperliquid

```javascript
class HyperliquidAdapter {
  // 认证
  authenticate(privateKey)  // 使用私钥而不是 API Key
  
  // 账户
  getAccountBalance()
  getPositions()
  
  // 下单
  placeOrder(symbol, side, size, price)
  closePosition(positionId)
  updateTP_SL(positionId, tp, sl)
  
  // 查询
  getOrder(orderId)
  getPosition(positionId)
}
```

---

## 📋 开发 Backlog

### Phase 1: 基础设施 (2-3 周)

- [ ] 数据库表设计和迁移
- [ ] 加密/解密模块 (API 密钥安全)
- [ ] OKX API 适配器
- [ ] Hyperliquid API 适配器
- [ ] CopyTradingService 核心引擎
- [ ] 信号接收和触发机制
- [ ] 仓位计算和风险验证
- [ ] 交易所下单和同步

### Phase 2: Web UI (1-2 周)

- [ ] 配置管理页面
- [ ] 仓位监控页面
- [ ] 日志查看页面
- [ ] 统计和分析页面
- [ ] API 连接测试
- [ ] 账户余额实时刷新

### Phase 3: 监控和告警 (1 周)

- [ ] Telegram 跟单通知
- [ ] 仓位同步和更新
- [ ] 自动 TP/SL 执行
- [ ] 风险告警系统
- [ ] 错误处理和重试机制

### Phase 4: 测试和优化 (1 周)

- [ ] 单元测试
- [ ] 集成测试
- [ ] 实际账户测试 (小金额)
- [ ] 性能优化
- [ ] 风险压力测试

### Phase 5: 高级功能 (可选)

- [ ] 部分跟单 (只跟单部分信号)
- [ ] 智能降杠杆 (根据亏损自动降)
- [ ] 多账户管理
- [ ] 跟单策略评分
- [ ] 历史回测分析

---

## ⚠️ 风险提示

### 1. 资金安全

```
✅ 做的对
- API 密钥加密存储
- IP 白名单限制
- 读写权限分离
- 撤销旧密钥，创建新密钥

❌ 不要做
- 密钥明文存储
- 共享 API 密钥
- 使用主账户密钥
- 给机器人完全权限
```

### 2. 交易风险

```
✅ 做的对
- 日亏损限额
- 单笔大小限额
- 杠杆限额
- 最大持仓数限额

❌ 不要做
- 无限杠杆
- 无限单笔大小
- 无止损
- 全仓交易
```

### 3. 执行风险

```
✅ 做的对
- 风险验证通过后才下单
- 定期同步仓位状态
- 异常情况告警
- 完整的审计日志

❌ 不要做
- 盲目下单
- 忽视网络延迟
- 过度自动化
- 无监控
```

---

## 🎯 成功标准

### Phase 1 完成后

✅ 可以在 Web UI 配置 OKX/Hyperliquid 账户  
✅ 接收 Discord 信号后自动下单  
✅ 仓位能正确同步和更新  
✅ 日志能完整记录所有操作  

### Phase 2 完成后

✅ Web UI 完全可用  
✅ 所有配置都可以通过 UI 管理  
✅ 实时显示跟单仓位和 PnL  
✅ 用户可以随时编辑配置  

### Phase 3 完成后

✅ Telegram 收到所有跟单通知  
✅ TP/SL 自动执行  
✅ 风险告警及时通知  
✅ 系统 7×24 稳定运行  

---

## 📞 相关资源

### OKX 文档
- https://www.okx.com/docs/en/
- 交易 API: https://www.okx.com/docs/en/#trading
- Python SDK: https://github.com/okx/okx-sdk

### Hyperliquid 文档
- https://hyperliquid.gitbook.io/hyperliquid-docs/
- REST API: https://hyperliquid.gitbook.io/hyperliquid-docs/api
- 示例代码：https://github.com/hyperliquid-dex/hl_python_sdk

---

**设计完成于：2026-03-19 21:25 GMT+11**
**下一步：实现 Phase 1 基础设施**


---

## 🎯 附加功能：Move SL to Break Even

### 概述

支持快速将止损移至保本价格（入场价）。这是交易员在仓位已盈利时常见的操作。

### 使用场景

```
交易员说：
"Move stop to BE"

系统执行：
1. 查询入场价 = 45000
2. 将 SL 更新为 45000
3. 发送确认："SL moved to BE at 45000"

结果：
- 即使止损触发，也只是保本
- 保护已赚取的利润
```

### API 端点

```javascript
// 移动止损到保本价格
PUT /api/v1/positions/:id/move-sl-to-be

Response:
{
  "success": true,
  "data": {
    "id": "pos_001",
    "symbol": "BTCUSD",
    "trader": "trader_eli",
    "entry": 45000,
    "sl": 45000,      // 现在等于 entry（保本）
    "action": "move_sl_to_be",
    "message": "SL moved to BE (45000)"
  }
}
```

### 跟单系统集成

在跟单仓位上也支持此操作：

```javascript
// 跟单仓位的 SL 也能移到 BE
PUT /api/v1/copy-trading/positions/:id/move-sl-to-be

当跟单的源仓位执行 "Move SL to BE" 时：
1. 自动检测源仓位的 SL 变化
2. 自动在跟单仓位上执行相同操作
3. 发送 Telegram 通知
4. 记录完整的历史
```

### 技术实现

#### 数据库记录

```javascript
{
  id: "pos_001",
  sl: 45000,           // 更新后的值
  metadata: {
    sl_history: [
      {
        action: "move_sl_to_be",
        old_sl: null,
        new_sl: 45000,
        timestamp: "2026-03-19T10:34:04.968Z",
        reason: "Manual SL adjustment to break even"
      }
    ],
    last_sl_adjustment: "2026-03-19T10:34:04.969Z"
  }
}
```

#### 修改历史追踪

SL 的所有修改都记录在 `metadata.sl_history` 中：
- 原 SL 值
- 新 SL 值
- 修改时间
- 修改原因

#### 自动同步机制

跟单系统自动检测源仓位的 SL 变化：

```javascript
// 仓位同步服务
async function syncPosition(copyPosition) {
  const source = await getSourcePosition(copyPosition.source_position_id);
  
  // 检查 SL 是否变化
  if (source.sl !== copyPosition.sl) {
    if (source.sl === source.entry) {
      // 源仓位移动了 SL 到 BE
      // 跟单仓位也执行相同操作
      await moveSlToBE(copyPosition.id);
      
      // 发送 Telegram 通知
      await telegram.notify('SL moved to BE', {
        trader: source.trader,
        symbol: copyPosition.symbol,
        be_price: source.entry
      });
    }
  }
}
```

### Telegram 通知

```
✅ SL 已移至保本
━━━━━━━━━━━━━━━━━━━━━
交易员: trader_eli
交易对: BTC-USDT
入场价: 45000
止损: 45000 (BE)
当前价: 46000 (+1000)

仓位现已保护，触发止损时保本
```

### 跟单系统中的应用

#### 配置选项

```javascript
{
  id: "config_001",
  // ... 其他配置
  
  auto_follow_sl_adjustments: true,    // 自动跟随 SL 调整
  sl_adjustment_delay_ms: 0,           // 延迟（0 = 立即执行）
  notify_on_sl_adjustment: true        // 调整时发送通知
}
```

#### 工作流程

```
源交易员执行: "Move stop to BE"
    ↓
本地系统检测 SL 变化
    ↓
CopyTradingService 识别
    ↓
【决策】
  ✅ auto_follow_sl_adjustments = true
    → 自动在跟单仓位执行相同操作
    → 发送 Telegram 通知
  
  ❌ auto_follow_sl_adjustments = false
    → 仅记录，不自动执行
    → 需要手动审批
```

### 数据完整性

每次 SL 调整都记录完整的审计信息：

```javascript
{
  action: "move_sl_to_be",
  old_sl: null,
  new_sl: 45000,
  source_price: 46000,      // 当时的市场价格
  reason: "Manual adjustment",
  timestamp: "2026-03-19T10:34:04Z",
  executed_by: "system",
  
  // 跟单系统额外字段
  source_position_id: "pos_001",
  copy_position_id: "copy_pos_001",
  auto_executed: true
}
```

### 限制和验证

```javascript
✅ 可以执行 Move SL to BE：
  • 仓位状态 = open
  • 原 SL 为空 或 原 SL < 入场价
  • 仓位未平仓

❌ 不能执行：
  • 仓位已平仓
  • 仓位处于 pending 状态
  • 无法获取入场价
```

### 未来扩展

- [ ] 支持 "Move TP to BE" 的变体
- [ ] 支持其他 SL 调整模式（如 Trailing SL）
- [ ] SL 调整的预测分析
- [ ] 历史 SL 调整的统计分析

---

