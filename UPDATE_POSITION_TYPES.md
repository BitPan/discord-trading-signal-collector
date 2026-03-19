# 仓位状态更新：激活订单 vs 挂单

## 数据库变更

### 新增字段
```sql
ALTER TABLE positions 
ADD COLUMN order_type VARCHAR(20) DEFAULT 'pending' 
CHECK (order_type IN ('pending', 'active'));
```

### 字段说明

| 字段 | 值 | 含义 |
|------|-----|------|
| **order_type** | `pending` | 挂单（未激活）|
| | `active` | 激活订单（已成交）|
| **status** | `pending` | 待处理 |
| | `open` | 持仓中 |
| | `closed` | 已平仓 |

### 映射关系
```
order_type + status 组合示意：

pending + pending  = 挂单，待激活
pending + open     = 异常状态
active + open      = 激活订单，持仓中
active + closed    = 已平仓订单
```

## API 响应格式

### GET /api/v1/positions

```json
{
  "success": true,
  "data": [
    {
      "id": "pos_001",
      "trader": "trader_eli",
      "symbol": "BTCUSD",
      "status": "open",
      "order_type": "active",    // 新增字段
      "entry": 45000,
      "size": 0.5,
      "created_at": "2026-03-19T20:00:00Z"
    },
    {
      "id": "pos_002",
      "trader": "achen886",
      "symbol": "ETHUSD",
      "status": "pending",
      "order_type": "pending",   // 挂单
      "entry": 2500,
      "size": 1.0,
      "created_at": "2026-03-19T20:05:00Z"
    }
  ]
}
```

## 前端 UI 更新

### 仓位列表显示

原来：
```
[OPEN]     trader_eli  BTCUSD  45000
[PENDING]  achen886    ETHUSD  2500
```

现在（区分激活/挂单）：
```
[激活订单]  trader_eli  BTCUSD  45000  ✅ 已成交持仓中
[挂 单]    achen886   ETHUSD  2500   ⏳ 待激活
```

### 颜色编码
- **绿色** (#4CAF50) - 激活订单（active）- 已成交
- **橙色** (#FF9800) - 挂单（pending）- 待激活
- **灰色** (#999) - 已平仓（closed）

## 业务逻辑

### 订单生命周期

```
创建时：
  order_type = "pending"  （默认为挂单）
  status = "pending"

激活时（用户确认）：
  order_type = "active"
  status = "open"

平仓时：
  order_type = "active"  （保持）
  status = "closed"
```

### API 端点

#### 创建持仓
```
POST /api/v1/positions
{
  "trader": "trader_eli",
  "symbol": "BTCUSD",
  "entry": 45000,
  "size": 0.5,
  "order_type": "pending"  // 默认为 pending
}
```

#### 激活订单
```
PUT /api/v1/positions/{id}/activate
Response:
{
  "id": "pos_001",
  "order_type": "active",  // 从 pending 变为 active
  "status": "open"
}
```

#### 平仓
```
PUT /api/v1/positions/{id}/close
{
  "exit": 46000
}
Response:
{
  "order_type": "active",  // 保持 active
  "status": "closed",
  "pnl": 500
}
```

## 前端组件更新

### PositionList.vue（示意）

```javascript
// 根据 order_type 渲染不同的样式
getOrderTypeBadge(orderType) {
  switch (orderType) {
    case 'active':
      return { class: 'badge-active', text: '激活订单 ✅' };
    case 'pending':
      return { class: 'badge-pending', text: '挂单 ⏳' };
    default:
      return { class: 'badge-default', text: orderType };
  }
}

// 激活订单按钮
async activateOrder(positionId) {
  await fetch(`/api/v1/positions/${positionId}/activate`, {
    method: 'PUT'
  });
  // 刷新列表
}
```

## 查询示例

### 查询所有激活订单
```sql
SELECT * FROM positions WHERE order_type = 'active' AND status = 'open';
```

### 查询所有挂单
```sql
SELECT * FROM positions WHERE order_type = 'pending';
```

### 查询交易员的激活订单数
```sql
SELECT trader, COUNT(*) as active_count 
FROM positions 
WHERE order_type = 'active' AND status = 'open'
GROUP BY trader;
```

## 迁移说明

### 已执行的迁移
```sql
-- 1. 添加 order_type 列
ALTER TABLE positions ADD COLUMN order_type VARCHAR(20) DEFAULT 'pending';

-- 2. 设置现有订单的类型
UPDATE positions 
SET order_type = CASE 
  WHEN status = 'open' THEN 'active'
  ELSE 'pending'
END;

-- 3. 添加约束
ALTER TABLE positions 
ADD CONSTRAINT check_order_type CHECK (order_type IN ('pending', 'active'));
```

### 向后兼容性
- ✅ 默认值为 'pending'
- ✅ 现有 API 端点仍然可用
- ✅ order_type 为可选字段

## 统计查询

```sql
-- 仓位统计（按类型）
SELECT 
  trader,
  order_type,
  COUNT(*) as count,
  SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) as open_count
FROM positions
GROUP BY trader, order_type;
```

---

**状态**：✅ 数据库已更新  
**日期**：2026-03-19 20:40  
**下一步**：更新 API 和前端 UI

