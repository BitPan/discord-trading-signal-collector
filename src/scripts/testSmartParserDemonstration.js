/**
 * 智能解析器演示 - 不依赖网络
 */

const smartParser = require('../modules/parser/smartSignalParser');

async function testSmartParser() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   智能信号解析 - 优先级策略演示                ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  // 场景 - 都是文本，不需要 OCR
  const testScenarios = [
    {
      name: '【场景 1】Eli 的标准限价单',
      content: 'Tao limit 228 218 stop 205',
      hasImages: false,
      description: '✅ 从文本直接识别，不需要 OCR'
    },
    {
      name: '【场景 2】结构化格式',
      content: 'LIMIT TAO | Entry: 228 - 218 | SL: 205 (≤ 10.09%)',
      hasImages: false,
      description: '✅ 从文本直接识别，不需要 OCR'
    },
    {
      name: '【场景 3】John 的直接命令',
      content: 'OPEN BTCUSD 45000 0.5',
      hasImages: false,
      description: '✅ 从文本直接识别，不需要 OCR'
    },
    {
      name: '【场景 4】Woods 的 LONG 命令',
      content: 'LONG SOL 120 10',
      hasImages: false,
      description: '✅ 从文本直接识别，不需要 OCR'
    },
    {
      name: '【场景 5】Astekz 的多个信号',
      content: 'OPEN BTC 44000 1.0 TP 46000 SL 43000 and CLOSE ETH 2400',
      hasImages: false,
      description: '✅ 从文本识别，第二个信号从文本提取'
    },
    {
      name: '【场景 6】文字 + 图片（优先用文字）',
      content: 'LONG BTC 43500 2.0',
      hasImages: true,
      description: '⏭️  识别文字信号后，会跳过图片 OCR（避免重复）'
    }
  ];

  for (const scenario of testScenarios) {
    console.log(`${scenario.name}`);
    console.log('─'.repeat(50));

    console.log(`📝 消息：${scenario.content}`);
    if (scenario.hasImages) {
      console.log(`🖼️  图片：有（但会被忽略）`);
    }
    console.log(`💡 策略：${scenario.description}\n`);

    try {
      // 构建消息对象
      const message = {
        id: `msg_${Date.now()}`,
        content: scenario.content,
        attachments: scenario.hasImages ? [
          {
            name: 'chart.png',
            contentType: 'image/png',
            url: 'https://discord.com/fake-url.png'
          }
        ] : [],
        embeds: []
      };

      const signals = await smartParser.parseMessage(message);

      if (signals.length > 0) {
        console.log(`  ✅ 识别到 ${signals.length} 个信号：\n`);
        signals.forEach((signal, idx) => {
          console.log(`    信号 ${idx + 1}:`);
          console.log(`      - 类型：${signal.type}`);
          console.log(`      - 交易对：${signal.symbol}`);
          console.log(`      - 操作：${signal.action}`);
          console.log(`      - 入场价：${signal.entry}`);
          if (signal.size) console.log(`      - 仓位：${signal.size}`);
          if (signal.takeProfit) console.log(`      - 获利：${signal.takeProfit}`);
          if (signal.stopLoss) console.log(`      - 止损：${signal.stopLoss}`);
        });
      } else {
        console.log(`  ❌ 未识别到信号`);
      }

    } catch (error) {
      console.log(`  ❌ 错误：${error.message}`);
    }

    console.log('\n');
  }

  console.log('═'.repeat(50));
  console.log('\n🎯 智能解析策略总结：\n');
  console.log('1️⃣  优先从文本解析');
  console.log('   ✓ 最快（毫秒级）');
  console.log('   ✓ 最可靠（无需网络和 GPU）');
  console.log('   ✓ 支持 4 种信号格式\n');

  console.log('2️⃣  仅在文本无信号时尝试 OCR');
  console.log('   ✓ 节省资源和时间');
  console.log('   ✓ 避免重复解析\n');

  console.log('3️⃣  文本 + 图片情况下，忽略图片');
  console.log('   ✓ 99% 的信号都是纯文本');
  console.log('   ✓ OCR 只作为备选方案\n');

  console.log('4️⃣  OCR 仅用于纯图片信号');
  console.log('   ✓ Eli 偶尔发的不可复制的图片');
  console.log('   ✓ Woods 的截图信号\n');

  console.log('═'.repeat(50));
  console.log('\n📊 性能估算：');
  console.log('  · 文本解析：< 1ms');
  console.log('  · 正则匹配：< 5ms');
  console.log('  · OCR 处理：2-5 秒（避免需要）\n');

  console.log('═'.repeat(50));

  process.exit(0);
}

testSmartParser().catch(err => {
  console.error('❌ 测试失败:', err);
  process.exit(1);
});
