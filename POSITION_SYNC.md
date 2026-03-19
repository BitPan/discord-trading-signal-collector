# 仓位同步和验证机制

## 概述

系统可以从 Discord 的 `active_future_channel`（ID: 1237622911393730632）读取所有交易员的仓位状态，用作**双向验证和同步机制**。

## 核心原理

```
┌─────────────────────┐         ┌──────────────────────┐
│  本地数据库仓位      │         │ Discord 频道仓位      │
│  (fast, real-time)  │◄───────►│  (authoritative,     │
└─────────────────────┘   60s   │   with slight lag)   │
                        同步     └──────────────────────┘
```

## 工作流程

### 1️⃣ 定期同步（每 60 秒）

系统后台自动定期同步：

```javascript
// 启动
positionSyncService.startPeriodicSync()

// 每 60 秒执行一次
// 1. 从 active_future_channel 读取最新消息
// 2. 解析仓位信息
// 3. 与本地数据库对比
// 4. 处理差异
```

### 2️⃣ 对比逻辑

| 场景 | 本地 | 远程 | 处理方式 |
|------|------|------|----------|
| ✅ 一致 | ✓ | ✓ | 保持不变 |
| ❌ 不一致 | 10 | 10.5 | **Telegram 告警** + 人工审查 |
| 🆕 缺失 | ❌ | ✓ | **自动创建** + 同步通知 |

### 3️⃣ 处理差异

**一致的仓位 ✅**
```
John: BTCUSD @ 45000 (仓位: 0.5)
→ 保持不变，无操作
```

**不一致的仓位 ⚠️**
```
Eli: TAOUSD
  本地仓位: 10
  远程仓位: 10.5
→ 发送 Telegram 告警
→ 等待人工确认（谁错了？）
```

**本地缺失的仓位 🆕**
```
Woods: SOLUSD @ 120 (仓位: 5)
→ 在本地数据库创建
→ 发送创建通知
```

## API 接口

### 获取同步状态

```bash
GET /api/v1/sync/status
```

**响应：**
```json
{
  "success": true,
  "data": {
    "lastSync": "2026-03-19T20:05:00.000Z",
    "syncChannel": "1237622911393730632",
    "syncInterval": 60000,
    "isRunning": true
  }
}
```

### 手动触发同步

```bash
POST /api/v1/sync/manual
```

**响应：**
```json
{
  "success": true,
  "message": "Manual sync started"
}
```

## Discord 频道消息格式

`active_future_channel` 中的仓位消息应该遵循这个格式：

```
[TRADER]: SYMBOL status ENTRY SIZE TP: PRICE SL: PRICE

例子：
John: BTCUSD open 45000 0.5 TP: 50000 SL: 43000
Eli: TAOUSD open 228 10 TP: 250 SL: 205
Woods: SOLUSD open 120 5 TP: 150 SL: 100
```

## 使用场景

### 1. 网络故障恢复
```
情况：Discord 消息落库失败，但交易员实际开了仓
恢复：60 秒内，active_future_channel 同步会检测到缺失仓位
处理：自动从频道创建本地仓位，恢复一致性
```

### 2. 数据库错误修复
```
情况：数据库中的仓位信息被意外修改
验证：同步会检测到不一致
处理：Telegram 告警 + 人工审查决定是否回滚
```

### 3. 多源输入支持
```
情况：交易员既在自动化系统发信号，也在 active_future_channel 手动报仓
支持：系统两个源都识别，自动合并/去重
```

### 4. 审计和跟踪
```
场景：完整的仓位变化历史
时间线：
  20:00 - 自动信号创建仓位
  20:01 - 同步验证一致
  20:05 - 交易员手动更新 TP
  20:05 - 同步检测不一致 → 告警 → 人工同步
  20:10 - 再次同步，验证一致 ✅
```

## 延迟容限

**为什么是 60 秒间隔？**

- ✅ `active_future_channel` 本身有延迟（用户手动更新）
- ✅ 避免频繁打扰（Telegram 通知轰炸）
- ✅ 节省资源（不需要实时）
- ✅ 足够快（对大多数场景）

## Telegram 通知示例

**创建新仓位**
```
✅ 仓位同步创建
从 active_future_channel 同步新仓位: 
Woods SOLUSD @ 120
```

**检测不一致**
```
⚠️ 仓位数据不一致
Eli 的 TAOUSD 仓位数据不一致。
本地: 仓位 10, 远程: 10.5
```

## 架构优势

| 特性 | 优势 |
|------|------|
| **双向验证** | 确保数据准确性和一致性 |
| **自动修复** | 缺失仓位自动从频道恢复 |
| **实时告警** | 异常立即通知，不会漏掉 |
| **容错机制** | 网络/数据库故障自恢复 |
| **人工干预** | 不一致时让人类判断，不盲目同步 |
| **完整审计** | 所有同步操作都有记录 |

## 配置参数

```javascript
// src/modules/position/positionSyncService.js

class PositionSyncService {
  constructor() {
    this.syncChannelId = '1237622911393730632';  // active_future_channel
    this.syncInterval = 60000;                   // 60 秒
    this.lastSyncTime = null;
  }
}
```

如需修改：
- `syncChannelId` - 修改同步频道（如果有多个）
- `syncInterval` - 调整同步频率

## 测试和演示

```bash
# 运行仓位同步测试
npm run test -- src/scripts/testPositionSync.js

# 查看演示输出
node src/scripts/testPositionSync.js
```

## 集成说明

仓位同步服务已集成到主应用中：

```javascript
// src/index.js

// 在应用启动后初始化同步
positionSyncService.startPeriodicSync()

// API 端点已注册
// GET  /api/v1/sync/status - 查看状态
// POST /api/v1/sync/manual - 手动同步
```

## 最佳实践

1. **定期审查告警** - 每天检查 Telegram 中的不一致告警
2. **维护频道格式** - 确保 `active_future_channel` 中的消息格式一致
3. **不要盲目信任** - 人工验证大额仓位变化
4. **监控延迟** - 如果发现同步滞后，检查 Discord API 连接
5. **备份数据** - 定期备份数据库，以防故障

## 故障排查

**问题：** 同步一直显示"未同步"

**解决：**
- 检查 Discord 连接是否正常
- 验证 `1237622911393730632` 频道 ID 正确
- 查看应用日志中的错误信息

**问题：** 频繁出现不一致警告

**解决：**
- 检查数据库中仓位大小的精度
- 允许合理的浮点数误差（±0.01）
- 确认 `active_future_channel` 中的数据是最新的

## 未来改进

- [ ] 支持多个同步频道
- [ ] 自动冲突解决算法（如果需要）
- [ ] 同步历史查询接口
- [ ] Webhook 实时推送（替代轮询）
- [ ] GraphQL API 支持

---

**最后更新：** 2026-03-19  
**维护者：** Lobster 🦞
