/**
 * 系统延迟测量工具
 * 演示从消息到通知的完整延迟
 */

const logger = require('../utils/logger');

async function measureLatency() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   系统延迟分析和演示                        ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // 演示场景
  const scenarios = [
    {
      name: '当前实现（轮询 60s）',
      stages: [
        { name: '交易员发送消息', duration: 0 },
        { name: '等待轮询检查', duration: '0-60s (平均 30s)' },
        { name: 'Discord API 读取', duration: '100-300ms' },
        { name: '文本解析', duration: '<1ms' },
        { name: '数据库存储', duration: '10-50ms' },
        { name: 'Telegram 发送', duration: '200-1000ms' },
        { name: '推送到手机', duration: '1-5s' }
      ],
      total: '30-61.5s（平均 31s）'
    },
    {
      name: '优化方案：轮询 10s',
      stages: [
        { name: '交易员发送消息', duration: 0 },
        { name: '等待轮询检查', duration: '0-10s (平均 5s)' },
        { name: 'Discord API 读取', duration: '100-300ms' },
        { name: '文本解析', duration: '<1ms' },
        { name: '数据库存储', duration: '10-50ms' },
        { name: 'Telegram 发送', duration: '200-1000ms' },
        { name: '推送到手机', duration: '1-5s' }
      ],
      total: '5-16.5s（平均 6-7s）'
    },
    {
      name: '实时方案：Discord Gateway',
      stages: [
        { name: '交易员发送消息', duration: 0 },
        { name: 'Discord Gateway 推送', duration: '10-100ms' },
        { name: '系统接收', duration: '0-10ms' },
        { name: '文本解析', duration: '<1ms' },
        { name: '数据库存储', duration: '10-50ms' },
        { name: 'Telegram 发送', duration: '200-1000ms' },
        { name: '推送到手机', duration: '1-5s' }
      ],
      total: '1.2-5.2s（平均 2-3s）'
    }
  ];

  for (const scenario of scenarios) {
    console.log(`\n【${scenario.name}】`);
    console.log('━'.repeat(48));

    let cumulativeMin = 0;
    let cumulativeMax = 0;

    scenario.stages.forEach((stage, idx) => {
      console.log(`  ${idx + 1}. ${stage.name}`);
      console.log(`     └─ ${stage.duration}`);

      // 计算累计延迟（仅数值）
      if (typeof stage.duration === 'number') {
        cumulativeMin += stage.duration;
        cumulativeMax += stage.duration;
      } else if (stage.duration.includes('ms')) {
        const match = stage.duration.match(/(\d+)-?(\d+)?/);
        if (match) {
          const min = parseInt(match[1]);
          const max = match[2] ? parseInt(match[2]) : min;
          cumulativeMin += min;
          cumulativeMax += max;
        }
      }
    });

    console.log(`\n  ⏱️ 总延迟：${scenario.total}`);
  }

  // 对比图表
  console.log('\n\n【对比图表】');
  console.log('━'.repeat(48));
  console.log('\n延迟分布（平均情况）:\n');

  const implementations = [
    { name: '当前（轮询 60s）', latency: 31, bar: '█' },
    { name: '轮询 10s（优化）', latency: 6.5, bar: '█' },
    { name: '实时 Gateway', latency: 2.5, bar: '█' }
  ];

  const maxLatency = Math.max(...implementations.map(i => i.latency));

  implementations.forEach(impl => {
    const barLength = Math.round((impl.latency / maxLatency) * 40);
    const bar = impl.bar.repeat(barLength);
    console.log(`${impl.name.padEnd(18)} │${bar}│ ${impl.latency}s`);
  });

  // 详细的时间线
  console.log('\n\n【详细时间线演示】');
  console.log('━'.repeat(48));

  console.log('\n场景：Eli 发送 "Tao limit 228 218 stop 205"\n');

  const timeline = [
    { time: '20:00:00.000', event: '✍️ Eli 在 Discord 发送消息', impl: '全部' },
    { time: '20:00:00.010', event: '📡 Discord Gateway 推送事件', impl: '实时' },
    { time: '20:00:00.050', event: '📥 实时系统接收', impl: '实时' },
    { time: '20:00:00.055', event: '🔍 文本解析完成', impl: '实时' },
    { time: '20:00:00.065', event: '💾 数据库插入', impl: '实时' },
    { time: '20:00:00.300', event: '📤 发送 Telegram API', impl: '实时' },
    { time: '20:00:01.500', event: '🔔 收到 Telegram 通知', impl: '实时' },
    { time: '20:00:05.000', event: '─', impl: '─' },
    { time: '20:00:05.000', event: '✍️ (轮询 10s) 轮询检查触发', impl: '轮询 10s' },
    { time: '20:00:05.300', event: '🔍 文本解析完成', impl: '轮询 10s' },
    { time: '20:00:05.315', event: '💾 数据库插入', impl: '轮询 10s' },
    { time: '20:00:05.600', event: '📤 发送 Telegram API', impl: '轮询 10s' },
    { time: '20:00:06.700', event: '🔔 收到 Telegram 通知', impl: '轮询 10s' },
    { time: '20:00:30.000', event: '─', impl: '─' },
    { time: '20:00:30.000', event: '✍️ (轮询 60s) 轮询检查触发', impl: '轮询 60s' },
    { time: '20:00:30.300', event: '🔍 文本解析完成', impl: '轮询 60s' },
    { time: '20:00:30.315', event: '💾 数据库插入', impl: '轮询 60s' },
    { time: '20:00:30.600', event: '📤 发送 Telegram API', impl: '轮询 60s' },
    { time: '20:00:31.700', event: '🔔 收到 Telegram 通知', impl: '轮询 60s' }
  ];

  timeline.forEach(item => {
    if (item.event === '─') {
      console.log('');
    } else {
      console.log(`${item.time}  ${item.event.padEnd(30)} [${item.impl}]`);
    }
  });

  // 建议
  console.log('\n\n【建议】');
  console.log('━'.repeat(48));
  console.log(`
1️⃣ 短期改进（10 分钟）
   改变轮询间隔：60s → 10s
   延迟改善：30s → 5-7s
   
   src/modules/discord/messageSyncService.js
   改动：this.syncInterval = 10000;

2️⃣ 中期优化（1-2 周）
   实现 Discord Gateway 实时监听
   延迟改善：30s → 1-2s
   需要：改动 userClient 实现

3️⃣ 生产级方案（2-4 周）
   完整的异步实时系统
   延迟目标：<500ms
   需要：MessageQueue + WebSocket + 优化
`);

  console.log('═'.repeat(48));

  process.exit(0);
}

measureLatency().catch(err => {
  console.error('❌ 测试失败:', err);
  process.exit(1);
});
