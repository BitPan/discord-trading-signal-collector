-- Discord Trading Signal Collector Database Schema
-- PostgreSQL 13+

-- 消息表：存储来自 Discord 的原始消息
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,              -- Discord message_id
  discord_user_id TEXT NOT NULL,    -- 发送者 ID
  discord_username TEXT,            -- 发送者用户名
  channel_id TEXT NOT NULL,         -- 频道 ID
  content TEXT,                     -- 消息内容
  attachments JSONB DEFAULT '[]',   -- 附件（图片链接等）
  created_at TIMESTAMP NOT NULL,    -- 消息创建时间
  fetched_at TIMESTAMP NOT NULL DEFAULT NOW(),  -- 爬取时间
  parsed BOOLEAN DEFAULT false,     -- 是否已解析
  metadata JSONB,                   -- 额外元数据
  UNIQUE(id, channel_id)
);

CREATE INDEX idx_messages_user_created ON messages(discord_user_id, created_at DESC);
CREATE INDEX idx_messages_channel_created ON messages(channel_id, created_at DESC);
CREATE INDEX idx_messages_parsed ON messages(parsed) WHERE NOT parsed;

-- 信号表：存储解析的交易信号
CREATE TABLE IF NOT EXISTS signals (
  id TEXT PRIMARY KEY,
  message_ids JSONB NOT NULL,       -- 来源消息 IDs 数组
  type TEXT NOT NULL,               -- 信号类型：direct_command | multi_message | image_ocr
  trader TEXT NOT NULL,             -- 交易者 ID
  symbol TEXT NOT NULL,             -- 交易对（BTC, ETH 等）
  action TEXT NOT NULL,             -- 操作：open | close | update
  
  -- 交易参数
  entry DECIMAL(20, 8),             -- 入场价
  size DECIMAL(20, 8),              -- 仓位大小
  tp JSONB,                         -- 目标价位数组 [tp1, tp2, ...]
  sl JSONB,                         -- 止损价位数组 [sl1, sl2, ...]
  direction TEXT,                   -- 方向：BUY | SELL
  
  -- 质量指标
  raw_data JSONB,                   -- 原始解析数据
  confidence FLOAT DEFAULT 1.0,     -- 置信度 0-1
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  parsed_at TIMESTAMP
);

CREATE INDEX idx_signals_trader_created ON signals(trader, created_at DESC);
CREATE INDEX idx_signals_symbol_trader ON signals(symbol, trader);
CREATE INDEX idx_signals_type ON signals(type);

-- 仓位表：存储交易者的开仓和平仓信息
CREATE TABLE IF NOT EXISTS positions (
  id TEXT PRIMARY KEY,
  trader TEXT NOT NULL,
  symbol TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | open | closed | cancelled
  
  -- 开仓信息
  entry DECIMAL(20, 8),
  size DECIMAL(20, 8),
  tp JSONB,                         -- [tp1, tp2, ...] 已达到的目标价位列表
  sl JSONB,                         -- [sl, ...] 止损价位
  opened_at TIMESTAMP,
  
  -- 平仓信息
  exit DECIMAL(20, 8),
  closed_at TIMESTAMP,
  pnl DECIMAL(20, 8),               -- 盈亏（必须计算：(exit-entry)*size）
  pnl_percent DECIMAL(5, 2),        -- 盈亏百分比
  
  -- 关联和元数据
  signal_ids JSONB,                 -- [signal_1, signal_2, ...]
  metadata JSONB,                   -- 额外信息
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_positions_trader_status ON positions(trader, status);
CREATE INDEX idx_positions_symbol_status ON positions(symbol, status);
CREATE INDEX idx_positions_opened_at ON positions(opened_at DESC);
CREATE INDEX idx_positions_closed_at ON positions(closed_at DESC);

-- 交易者信息表：存储交易者统计数据
CREATE TABLE IF NOT EXISTS traders (
  id TEXT PRIMARY KEY,
  discord_user_id TEXT UNIQUE,
  username TEXT,
  
  -- 统计数据
  total_positions INT DEFAULT 0,
  win_count INT DEFAULT 0,
  loss_count INT DEFAULT 0,
  win_rate DECIMAL(5, 2),
  total_pnl DECIMAL(20, 8),
  avg_pnl DECIMAL(20, 8),
  
  metadata JSONB,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_traders_win_rate ON traders(win_rate DESC);

-- 事件日志表：审计和追踪
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,        -- message_fetched | signal_parsed | position_updated | error
  entity_type TEXT NOT NULL,       -- position | signal | message | trader
  entity_id TEXT,                  -- 关联的实体 ID
  
  data JSONB,                      -- 事件数据
  error JSONB,                     -- 错误信息（如果有）
  
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_type_timestamp ON events(event_type, timestamp DESC);
CREATE INDEX idx_events_entity ON events(entity_type, entity_id);
CREATE INDEX idx_events_timestamp ON events(timestamp DESC);

-- 触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_traders_updated_at BEFORE UPDATE ON traders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
