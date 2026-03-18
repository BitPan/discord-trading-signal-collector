# Discord Trading Signal Collector - 测试策略

## 🎯 测试目标

确保系统能够：
1. **稳定性**：7×24 小时不中断运行
2. **准确性**：信号识别准确率 > 95%
3. **可靠性**：故障自动恢复
4. **性能**：API 响应 < 200ms，消息处理 < 1 秒

---

## 📋 测试分类

### 1. 单元测试 (Unit Tests)

**框架**：Jest  
**覆盖率目标**：> 80%  
**运行时间**：< 5 分钟

#### 1.1 DirectCommandParser 单元测试

**测试文件**：`src/tests/unit/parser/directCommand.test.js`

```javascript
describe('DirectCommandParser', () => {
  const parser = new DirectCommandParser();
  
  // 正常格式
  it('should parse standard OPEN command', () => {
    const result = parser.parse('OPEN BTCUSD 45000 0.5 BUY');
    expect(result).toEqual({
      type: 'direct_command',
      action: 'open',
      symbol: 'BTCUSD',
      entry: 45000,
      size: 0.5,
      direction: 'BUY',
      confidence: 1.0
    });
  });
  
  // 变形格式
  it('should handle lowercase commands', () => {
    const result = parser.parse('open btc 45000 0.5');
    expect(result.action).toBe('open');
  });
  
  // 边界情况
  it('should handle extreme prices and sizes', () => {
    const result = parser.parse('OPEN BTC 100000 10 BUY');
    expect(result).toBeTruthy();
  });
  
  // 异常情况
  it('should return null for non-command text', () => {
    const result = parser.parse('This is just a random message');
    expect(result).toBeNull();
  });
  
  // 置信度
  it('should lower confidence for ambiguous commands', () => {
    const result = parser.parse('maybe OPEN at 45000');
    expect(result.confidence).toBeLessThan(1.0);
  });
});
```

**测试用例数**：20+

---

#### 1.2 MultiMessageAnalyzer 单元测试

**测试文件**：`src/tests/unit/parser/multiMessage.test.js`

```javascript
describe('MultiMessageAnalyzer', () => {
  const analyzer = new MultiMessageAnalyzer();
  
  it('should aggregate related messages', () => {
    const messages = [
      { id: '1', content: 'Looking at BTC', timestamp: 100, user: 'trader1' },
      { id: '2', content: 'Entry: 45000, Size: 0.5', timestamp: 105, user: 'trader1' },
      { id: '3', content: 'TP: 46000, SL: 44500', timestamp: 110, user: 'trader1' }
    ];
    
    const result = analyzer.aggregate(messages);
    expect(result).toEqual({
      type: 'multi_message_analysis',
      entry: 45000,
      size: 0.5,
      tp: [46000],
      sl: [44500],
      message_ids: ['1', '2', '3']
    });
  });
  
  it('should not aggregate messages from different users', () => {
    const messages = [
      { id: '1', content: 'Entry: 45000', user: 'trader1' },
      { id: '2', content: 'Size: 0.5', user: 'trader2' }
    ];
    
    const result = analyzer.aggregate(messages);
    expect(result).toBeNull();
  });
  
  it('should handle messages with time gaps > 10min', () => {
    const messages = [
      { id: '1', content: 'Entry: 45000', timestamp: 100, user: 'trader1' },
      { id: '2', content: 'Size: 0.5', timestamp: 800, user: 'trader1' } // 700s = 11.6 min
    ];
    
    const result = analyzer.aggregate(messages);
    expect(result).toBeNull();
  });
});
```

**测试用例数**：15+

---

#### 1.3 PositionManager 单元测试

**测试文件**：`src/tests/unit/position/manager.test.js`

```javascript
describe('PositionManager', () => {
  let manager;
  
  beforeEach(() => {
    manager = new PositionManager(mockDb);
  });
  
  describe('State Transitions', () => {
    it('should create position in PENDING state', () => {
      const position = manager.createPosition({
        trader: 'user1',
        symbol: 'BTCUSD',
        entry: 45000,
        size: 0.5
      });
      
      expect(position.status).toBe('PENDING');
      expect(position.id).toBeDefined();
    });
    
    it('should transition PENDING → OPEN', () => {
      const pos = manager.createPosition({...});
      manager.openPosition(pos.id);
      
      expect(pos.status).toBe('OPEN');
      expect(pos.opened_at).toBeDefined();
    });
    
    it('should transition OPEN → CLOSED', () => {
      const pos = manager.createPosition({...});
      manager.openPosition(pos.id);
      manager.closePosition(pos.id, { exit: 46000 });
      
      expect(pos.status).toBe('CLOSED');
      expect(pos.pnl).toBe(500); // (46000-45000) * 0.5
    });
  });
  
  describe('Validation', () => {
    it('should reject invalid entry price', () => {
      expect(() => {
        manager.createPosition({
          entry: -45000, // negative
          size: 0.5
        });
      }).toThrow('Invalid entry price');
    });
    
    it('should validate TP/SL relationship', () => {
      expect(() => {
        manager.createPosition({
          entry: 45000,
          tp: [44000], // TP below entry
          sl: [46000]  // SL above entry
        });
      }).toThrow('Invalid TP/SL');
    });
  });
});
```

**测试用例数**：25+

---

### 2. 集成测试 (Integration Tests)

**框架**：Jest + Test Discord Server  
**耗时**：5-10 分钟  
**运行频率**：每次提交

#### 2.1 端到端信号处理流程

**测试文件**：`src/tests/integration/signalFlow.test.js`

```javascript
describe('End-to-End Signal Processing', () => {
  let collector, parser, positionManager, db;
  
  beforeAll(async () => {
    // 启动测试 Discord 服务器连接
    collector = new DiscordCollector(testBotToken);
    await collector.connect();
    
    // 初始化其他组件
    db = new TestDatabase();
    parser = new SignalParser();
    positionManager = new PositionManager(db);
  });
  
  it('should process direct command end-to-end', async () => {
    // 在测试服务器发送消息
    const msg = await testChannel.send('OPEN BTCUSD 45000 0.5 BUY');
    
    // 等待消息被收集和处理
    await sleep(2000);
    
    // 验证信号被保存
    const signals = await db.findSignals({ message_id: msg.id });
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({
      type: 'direct_command',
      action: 'open',
      symbol: 'BTCUSD'
    });
    
    // 验证仓位被创建
    const positions = await db.findPositions({ trader: 'test_trader' });
    expect(positions).toHaveLength(1);
    expect(positions[0].status).toBe('PENDING');
  });
  
  it('should process multi-message analysis', async () => {
    // 发送第一条消息
    const msg1 = await testChannel.send('Looking at BTC, strong support');
    await sleep(500);
    
    // 发送第二条消息
    const msg2 = await testChannel.send('Entry at 45000, size 0.5');
    await sleep(500);
    
    // 发送第三条消息
    const msg3 = await testChannel.send('TP: 46000, SL: 44500');
    await sleep(2000);
    
    // 验证被聚合为单个信号
    const signals = await db.findSignals({ 
      user: 'test_trader',
      type: 'multi_message_analysis'
    });
    expect(signals).toHaveLength(1);
    expect(signals[0].message_ids).toHaveLength(3);
  });
  
  it('should handle signal modifications', async () => {
    // 创建初始仓位
    const msg1 = await testChannel.send('OPEN ETH 2500 1 BUY');
    await sleep(2000);
    
    // 发送修改消息
    const msg2 = await testChannel.send('Add TP: 2600');
    await sleep(2000);
    
    // 验证仓位被更新
    const positions = await db.findPositions({ symbol: 'ETH' });
    expect(positions[0].tp).toContain(2600);
  });
  
  afterAll(async () => {
    await collector.disconnect();
  });
});
```

---

#### 2.2 API 集成测试

**测试文件**：`src/tests/integration/api.test.js`

```javascript
describe('REST API Integration', () => {
  let app, db;
  
  beforeAll(async () => {
    app = createApp();
    db = new TestDatabase();
    await app.listen(3001);
  });
  
  describe('GET /api/v1/positions', () => {
    beforeEach(async () => {
      // 插入测试数据
      await db.positions.insert({
        id: 'pos1',
        trader: 'trader1',
        symbol: 'BTC',
        status: 'open',
        entry: 45000,
        size: 0.5
      });
    });
    
    it('should list all open positions', async () => {
      const res = await request(app)
        .get('/api/v1/positions?status=open')
        .set('Authorization', 'Bearer test_token');
      
      expect(res.status).toBe(200);
      expect(res.body.positions).toHaveLength(1);
      expect(res.body.positions[0].id).toBe('pos1');
    });
    
    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/v1/positions?limit=10&offset=0')
        .set('Authorization', 'Bearer test_token');
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('positions');
    });
    
    it('should filter by trader', async () => {
      const res = await request(app)
        .get('/api/v1/positions?trader=trader1')
        .set('Authorization', 'Bearer test_token');
      
      expect(res.status).toBe(200);
      expect(res.body.positions).toHaveLength(1);
    });
  });
  
  describe('GET /api/v1/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/v1/health');
      
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        status: expect.stringMatching(/ok|degraded|offline/),
        discord_connected: expect.any(Boolean),
        db_connected: expect.any(Boolean)
      });
    });
  });
  
  afterAll(async () => {
    await app.close();
  });
});
```

---

### 3. 端到端测试 (E2E Tests)

**工具**：Jest + Discord.js + Telegram API  
**耗时**：10-15 分钟  
**运行频率**：每日或每周

#### 3.1 完整的消息-信号-仓位流程

**测试文件**：`src/tests/e2e/fullWorkflow.test.js`

```javascript
describe('E2E: Full Trading Signal Workflow', () => {
  let testServer, testChannel, discordCollector;
  
  beforeAll(async () => {
    // 创建测试 Discord 服务器
    testServer = await createTestServer();
    testChannel = await testServer.createTextChannel('trading-signals');
    
    // 启动 Discord Collector
    discordCollector = new DiscordCollector(botToken);
    await discordCollector.connect();
  });
  
  it('should handle complete OPEN → CLOSE workflow', async () => {
    console.log('📤 Step 1: Sending OPEN command...');
    const openMsg = await testChannel.send(`
      OPEN BTCUSD
      Entry: 45000
      Size: 0.5
      Direction: BUY
      TP: 46000, 47000
      SL: 44500
    `);
    
    console.log('⏳ Waiting for signal processing...');
    await sleep(3000);
    
    console.log('🔍 Step 2: Verifying signal in database...');
    const signals = await db.signals.find({ message_id: openMsg.id });
    expect(signals).toHaveLength(1);
    const signal = signals[0];
    
    console.log('✅ Signal detected:', signal);
    expect(signal).toMatchObject({
      symbol: 'BTCUSD',
      action: 'open',
      entry: 45000,
      size: 0.5
    });
    
    console.log('🔍 Step 3: Verifying position in database...');
    const positions = await db.positions.find({ signal_id: signal.id });
    expect(positions).toHaveLength(1);
    const position = positions[0];
    
    console.log('✅ Position created:', position);
    expect(position).toMatchObject({
      status: 'PENDING',
      entry: 45000,
      size: 0.5
    });
    
    console.log('🌐 Step 4: Verifying API endpoint...');
    const apiRes = await fetch(`http://localhost:3000/api/v1/positions/${position.id}`);
    const apiData = await apiRes.json();
    
    console.log('✅ API returned position:', apiData);
    expect(apiData.position.id).toBe(position.id);
    
    console.log('📤 Step 5: Sending CLOSE command...');
    const closeMsg = await testChannel.send('CLOSE BTCUSD 46000');
    await sleep(3000);
    
    console.log('🔍 Step 6: Verifying position closure...');
    const closedPosition = await db.positions.findOne({ id: position.id });
    
    console.log('✅ Position closed:', closedPosition);
    expect(closedPosition.status).toBe('CLOSED');
    expect(closedPosition.pnl).toBe(500); // (46000 - 45000) * 0.5
    
    console.log('✅ E2E workflow completed successfully!');
  }, 60000);
  
  it('should send Telegram alert on Discord disconnect', async () => {
    console.log('🔌 Simulating Discord disconnect...');
    await discordCollector.disconnect();
    
    console.log('⏳ Waiting for alert...');
    await sleep(5000);
    
    console.log('📝 Checking Telegram messages...');
    const alerts = await getTelegramMessages(testChatId);
    const disconnectAlert = alerts.find(msg => 
      msg.text.includes('Discord') && msg.text.includes('disconnect')
    );
    
    expect(disconnectAlert).toBeDefined();
    console.log('✅ Telegram alert received:', disconnectAlert.text);
    
    console.log('🔄 Reconnecting...');
    await discordCollector.connect();
  }, 60000);
  
  afterAll(async () => {
    await discordCollector.disconnect();
    await testServer.delete();
  });
});
```

---

#### 3.2 错误恢复和告警测试

**测试文件**：`src/tests/e2e/resilience.test.js`

```javascript
describe('E2E: Resilience & Alert Mechanisms', () => {
  it('should auto-reconnect on network error', async () => {
    const monitor = new HealthMonitor();
    
    // 模拟网络错误
    simulateNetworkError();
    
    // 验证告警被发送
    const alerts = await waitForTelegramAlert('Discord connection lost', 30000);
    expect(alerts.length).toBeGreaterThan(0);
    
    // 验证自动重连
    const reconnected = await waitForEvent('discord:reconnected', 30000);
    expect(reconnected).toBeDefined();
  }, 60000);
  
  it('should handle database connection loss', async () => {
    // 停止 PostgreSQL
    await stopPostgresContainer();
    
    // 验证告警
    const alerts = await waitForTelegramAlert('Database connection failed', 30000);
    expect(alerts.length).toBeGreaterThan(0);
    
    // 启动 PostgreSQL
    await startPostgresContainer();
    
    // 验证重连和恢复
    const recovered = await waitForEvent('database:recovered', 60000);
    expect(recovered).toBeDefined();
  }, 120000);
  
  it('should handle message queue backlog', async () => {
    const initialQueueSize = messageQueue.size;
    
    // 发送大量消息（500+）
    for (let i = 0; i < 500; i++) {
      await testChannel.send(`Test message ${i}`);
    }
    
    // 监控队列大小
    let maxQueueSize = initialQueueSize;
    for (let i = 0; i < 60; i++) {
      maxQueueSize = Math.max(maxQueueSize, messageQueue.size);
      if (messageQueue.size === initialQueueSize) break; // 队列已处理完
      await sleep(1000);
    }
    
    // 验证队列被正确处理
    expect(messageQueue.size).toBeLessThanOrEqual(initialQueueSize);
    
    // 验证没有告警（正常处理）
    const alerts = await getTelegramAlerts('last_5min');
    expect(alerts).toHaveLength(0);
  }, 90000);
});
```

---

### 4. 性能测试 (Performance Tests)

**工具**：Apache JMeter / k6 / artillery  
**运行频率**：每周

#### 4.1 API 性能基准

**测试文件**：`src/tests/performance/api.load.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 20 },   // 30秒内渐进到 20 个并发用户
    { duration: '1m', target: 100 },   // 再 1 分钟增加到 100
    { duration: '30s', target: 0 },    // 最后 30 秒降到 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'], // 95%响应 <200ms
    http_req_failed: ['rate<0.1'],                   // 失败率 <10%
  },
};

export default function () {
  // 测试：查询所有仓位
  let res = http.get('http://localhost:3000/api/v1/positions', {
    headers: { 'Authorization': 'Bearer test_token' },
  });
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  sleep(1);
}
```

**预期结果**：
- p95 响应时间：< 200ms
- p99 响应时间：< 500ms
- 失败率：< 0.1%

---

#### 4.2 消息处理吞吐量

**测试文件**：`src/tests/performance/messaging.load.js`

```javascript
describe('Message Processing Throughput', () => {
  it('should process 1000 messages in < 60 seconds', async () => {
    const startTime = Date.now();
    const messageCount = 1000;
    
    // 快速发送 1000 条消息到测试频道
    for (let i = 0; i < messageCount; i++) {
      testChannel.send(`Test message ${i}`);
    }
    
    // 等待所有消息被处理
    let processedCount = 0;
    while (processedCount < messageCount && Date.now() - startTime < 60000) {
      processedCount = await db.messages.count({ fetched_at: { $gt: startTime } });
      await sleep(1000);
    }
    
    const duration = (Date.now() - startTime) / 1000;
    const throughput = messageCount / duration;
    
    console.log(`Processed ${messageCount} messages in ${duration}s`);
    console.log(`Throughput: ${throughput} messages/second`);
    
    expect(duration).toBeLessThan(60);
    expect(throughput).toBeGreaterThan(16); // > 16 msg/sec
  }, 90000);
});
```

**预期结果**：
- 吞吐量：> 16 消息/秒
- 平均延迟：< 1 秒

---

### 5. 压力测试 (Stress Tests)

**运行频率**：每月一次

```javascript
describe('Stress Tests', () => {
  it('should handle 10000 open positions', async () => {
    // 插入 10000 个仓位
    const positions = Array.from({ length: 10000 }, (_, i) => ({
      id: `pos_${i}`,
      trader: `trader_${i % 100}`,
      symbol: 'BTC',
      status: 'open',
      entry: 45000 + Math.random() * 1000,
      size: Math.random(),
    }));
    
    console.time('bulk_insert');
    await db.positions.bulkInsert(positions);
    console.timeEnd('bulk_insert');
    
    // 测试查询性能
    console.time('query_all_open');
    const openPos = await db.positions.find({ status: 'open' });
    console.timeEnd('query_all_open');
    
    expect(openPos).toHaveLength(10000);
    expect(openPos[0]).toHaveProperty('id');
  }, 60000);
});
```

---

## 🔄 持续集成测试流程

### GitHub Actions 工作流

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run coverage
      - uses: codecov/codecov-action@v2

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost/test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run test:e2e
        env:
          DISCORD_BOT_TOKEN: ${{ secrets.DISCORD_TEST_BOT_TOKEN }}
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_TEST_BOT_TOKEN }}
```

---

## 📊 测试覆盖报告

### 目标

| 模块 | 覆盖率 | 单元 | 集成 | E2E |
|------|--------|------|------|-----|
| **DirectCommandParser** | 95% | ✅ 20+ | ✅ | ✅ |
| **MultiMessageAnalyzer** | 90% | ✅ 15+ | ✅ | ✅ |
| **PositionManager** | 85% | ✅ 25+ | ✅ | ✅ |
| **DatabaseService** | 80% | ✅ 30+ | ✅ | - |
| **REST API** | 85% | ✅ 40+ | ✅ | ✅ |
| **HealthMonitor** | 75% | ✅ 15+ | ✅ | ✅ |
| **整体** | **85%** | | | |

---

## ✅ 测试检查清单

发布前必须检查：

- [ ] 所有单元测试通过（npm run test:unit）
- [ ] 代码覆盖率 > 80%（npm run coverage）
- [ ] 集成测试通过（npm run test:integration）
- [ ] E2E 测试通过（npm run test:e2e）
- [ ] 性能指标达标（API p95 < 200ms）
- [ ] Linting 通过（npm run lint）
- [ ] 没有 console.log 调试代码
- [ ] 文档已更新

---

## 📝 测试报告模板

每周生成一份测试报告：

```markdown
# 测试报告 - Week X

## 概览
- 总测试数：XXX
- 通过率：XX%
- 覆盖率：XX%

## 单元测试
- 运行时间：X.XXs
- 通过数：XXX
- 失败数：X

## 集成测试
- 运行时间：XXs
- 通过数：XX
- 失败数：X

## E2E 测试
- 运行时间：XXs
- 通过数：X
- 失败数：0

## 性能指标
- API p95：XXms
- 消息吞吐：XX msg/s

## 已知问题
- [列出需要修复的问题]

## 下周行动项
- [TODO]
```
