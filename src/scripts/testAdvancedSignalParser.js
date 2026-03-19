/**
 * 高级信号解析器测试
 */

const advancedParser = require('../modules/parser/advancedSignalParser');
const logger = require('../utils/logger');

async function testParser() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   高级信号解析器测试                        ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // 测试用例
  const testCases = [
    {
      name: '直接命令格式',
      content: 'OPEN BTCUSD 45000 0.5'
    },
    {
      name: '限价单格式',
      content: 'Tao limit 228 218 stop 205'
    },
    {
      name: '多个信号',
      content: 'OPEN ETH 2500 1.0 and CLOSE BTC 46000'
    },
    {
      name: 'LONG/SHORT 格式',
      content: 'LONG SOL 120 10 TP:150 SL:100'
    },
    {
      name: 'Limit TAO 识别',
      content: 'LIMIT TAO | Entry: 228 - 218 | SL: 205 (≤ 10.09%)'
    }
  ];

  for (const testCase of testCases) {
    console.log(`【${testCase.name}】`);
    console.log(`输入: "${testCase.content}"`);

    // 创建模拟消息对象
    const message = {
      id: `test_${Date.now()}`,
      content: testCase.content,
      attachments: [],
      embeds: []
    };

    try {
      const signals = await advancedParser.parseMessage(message);

      if (signals.length > 0) {
        signals.forEach((signal, idx) => {
          console.log(`  信号 ${idx + 1}:`);
          console.log(`    - 类型: ${signal.type}`);
          console.log(`    - 操作: ${signal.action}`);
          console.log(`    - 交易对: ${signal.symbol}`);
          console.log(`    - 入场价: ${signal.entry}`);
          if (signal.size) console.log(`    - 仓位: ${signal.size}`);
          if (signal.stopLoss) console.log(`    - 止损: ${signal.stopLoss}`);
          if (signal.takeProfit) console.log(`    - 获利: ${signal.takeProfit}`);
          console.log(`    - 方向: ${signal.direction}`);
        });
      } else {
        console.log('  ❌ 未识别到信号');
      }
    } catch (error) {
      console.log(`  ❌ 解析错误: ${error.message}`);
    }

    console.log('');
  }

  console.log('═'.repeat(44));
  console.log('✅ 测试完成！');
  console.log('═'.repeat(44));

  process.exit(0);
}

testParser().catch(err => {
  console.error('❌ 测试失败:', err);
  process.exit(1);
});
