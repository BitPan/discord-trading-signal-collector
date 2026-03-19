/**
 * Telegram 通知测试脚本
 * 测试各种通知类型
 */

const telegramService = require('../modules/telegram/telegramService');
const logger = require('../utils/logger');

async function testTelegramNotifications() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   Telegram 通知测试                     ║');
  console.log('╚════════════════════════════════════════╝\n');

  const testPosition = {
    id: 'pos_test_001',
    trader: 'trader_test',
    symbol: 'BTCUSD',
    status: 'open',
    entry: '45000',
    exit: '46000',
    size: '0.5',
    pnl: 500,
    pnl_percent: 2.22,
    created_at: new Date(),
    updated_at: new Date()
  };

  const testSignal = {
    id: 'sig_test_001',
    trader: 'trader_test',
    symbol: 'BTCUSD',
    action: 'open',
    entry: 45000,
    size: 0.5
  };

  try {
    // 测试 1: 连接
    console.log('【测试 1】Telegram 连接');
    const connected = await telegramService.testConnection();
    console.log(`  结果：${connected ? '✅ 成功' : '❌ 失败'}\n`);

    if (!connected) {
      console.log('❌ Telegram 未能连接，停止测试');
      process.exit(1);
    }

    // 测试 2: 新建仓位通知
    console.log('【测试 2】新建仓位通知');
    const result2 = await telegramService.notifyPositionOpened(testPosition, testSignal);
    console.log(`  结果：${result2 ? '✅ 发送成功' : '❌ 发送失败'}\n`);

    // 测试 3: 设置 TP 通知
    console.log('【测试 3】设置获利点通知');
    const result3 = await telegramService.notifyTargetProfit(testPosition, 50000);
    console.log(`  结果：${result3 ? '✅ 发送成功' : '❌ 发送失败'}\n`);

    // 测试 4: 设置 SL 通知
    console.log('【测试 4】设置止损点通知');
    const result4 = await telegramService.notifyStopLoss(testPosition, 43000);
    console.log(`  结果：${result4 ? '✅ 发送成功' : '❌ 发送失败'}\n`);

    // 测试 5: 平仓通知
    console.log('【测试 5】平仓通知');
    const result5 = await telegramService.notifyPositionClosed(testPosition);
    console.log(`  结果：${result5 ? '✅ 发送成功' : '❌ 发送失败'}\n`);

    // 测试 6: 系统告警
    console.log('【测试 6】系统告警通知');
    const result6 = await telegramService.notifyAlert(
      '系统测试告警',
      '这是一条来自测试脚本的系统告警通知',
      'warning'
    );
    console.log(`  结果：${result6 ? '✅ 发送成功' : '❌ 发送失败'}\n`);

    console.log('═'.repeat(40));
    console.log('✅ 所有测试完成！');
    console.log('═'.repeat(40));

    process.exit(0);
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

testTelegramNotifications();
