/**
 * 智能信号解析器测试
 * 演示：优先文本 → 不足时才用 OCR
 */

const smartParser = require('../modules/parser/smartSignalParser');

async function testSmartParser() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   智能信号解析 - 优先级策略测试             ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // 测试场景
  const testScenarios = [
    {
      name: '【场景 1】Eli 的标准限价单格式',
      message: {
        id: 'msg_001',
        content: 'Tao limit 228 218 stop 205',
        attachments: [],
        embeds: []
      },
      expectedMethod: 'text_parsing'
    },
    {
      name: '【场景 2】结构化 Limit TAO 格式',
      message: {
        id: 'msg_002',
        content: 'LIMIT TAO | Entry: 228 - 218 | SL: 205 (≤ 10.09%)',
        attachments: [],
        embeds: []
      },
      expectedMethod: 'text_parsing'
    },
    {
      name: '【场景 3】直接命令格式',
      message: {
        id: 'msg_003',
        content: 'OPEN BTCUSD 45000 0.5',
        attachments: [],
        embeds: []
      },
      expectedMethod: 'text_parsing'
    },
    {
      name: '【场景 4】只有图片，没有文字',
      message: {
        id: 'msg_004',
        content: '',
        attachments: [
          {
            name: 'trading_signal.png',
            contentType: 'image/png',
            url: 'https://example.com/signal.png',
            size: 102400
          }
        ],
        embeds: []
      },
      expectedMethod: 'ocr_only'
    },
    {
      name: '【场景 5】文字信号 + 图片（使用文字）',
      message: {
        id: 'msg_005',
        content: 'LONG ETH 2500 1.0',
        attachments: [
          {
            name: 'chart.png',
            contentType: 'image/png',
            url: 'https://example.com/chart.png',
            size: 204800
          }
        ],
        embeds: []
      },
      expectedMethod: 'text_parsing_skip_ocr'
    }
  ];

  for (const scenario of testScenarios) {
    console.log(`${scenario.name}`);
    console.log('─'.repeat(44));

    if (scenario.message.content) {
      console.log(`📝 文字：${scenario.message.content}`);
    }
    if (scenario.message.attachments.length > 0) {
      console.log(`🖼️ 图片：${scenario.message.attachments.map(a => a.name).join(', ')}`);
    }

    try {
      const signals = await smartParser.parseMessage(scenario.message);

      console.log(`\n✅ 解析结果：${signals.length} 个信号`);

      signals.forEach((signal, idx) => {
        console.log(`\n  信号 ${idx + 1}:`);
        console.log(`    - 方法：${signal.type}`);
        console.log(`    - 交易对：${signal.symbol}`);
        console.log(`    - 入场：${signal.entry}`);
        if (signal.takeProfit) console.log(`    - 获利：${signal.takeProfit}`);
        if (signal.stopLoss) console.log(`    - 止损：${signal.stopLoss}`);
        if (signal.source) console.log(`    - 来源：${signal.source}`);
      });

      console.log(`\n📊 预期方法：${scenario.expectedMethod}`);
      const actualMethod = signals.length > 0 ? signals[0].type : 'no_signals';
      console.log(`📊 实际方法：${actualMethod}`);

    } catch (error) {
      console.log(`❌ 错误：${error.message}`);
    }

    console.log('\n');
  }

  console.log('═'.repeat(44));
  console.log('💡 智能策略总结：');
  console.log('  1. ✅ 优先从文本解析（最快，最可靠）');
  console.log('  2. ⏭️  仅在文本无信号时才使用 OCR');
  console.log('  3. 📊 文本 + 图片时，忽略图片（避免重复）');
  console.log('  4. 🔍 OCR 仅作为后备方案');
  console.log('═'.repeat(44));

  process.exit(0);
}

testSmartParser().catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});
