/**
 * 仓位同步和验证测试
 * 演示如何从 active_future_channel 验证仓位数据
 */

const positionSyncService = require('../modules/position/positionSyncService');

async function testPositionSync() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   仓位同步和验证机制                        ║');
  console.log('╚════════════════════════════════════════════╝\n');

  console.log('📊 工作流程：\n');
  console.log('1️⃣  获取本地仓位（数据库）');
  console.log('2️⃣  从 active_future_channel 读取远程仓位');
  console.log('3️⃣  对比和验证数据一致性');
  console.log('4️⃣  处理差异（缺失/不一致）');
  console.log('5️⃣  Telegram 告警\n');

  // 模拟本地仓位
  const localPositions = [
    {
      id: 'pos_001',
      trader: 'John',
      symbol: 'BTCUSD',
      status: 'open',
      entry: 45000,
      size: 0.5,
      tp: 50000,
      sl: 43000
    },
    {
      id: 'pos_002',
      trader: 'Eli',
      symbol: 'TAOUSD',
      status: 'open',
      entry: 228,
      size: 10,
      tp: 250,
      sl: 205
    }
  ];

  console.log('【本地仓位（数据库）】');
  localPositions.forEach(pos => {
    console.log(`  ${pos.trader}: ${pos.symbol} @ ${pos.entry} (仓位: ${pos.size}, TP: ${pos.tp}, SL: ${pos.sl})`);
  });

  // 模拟远程仓位（从 active_future_channel 读取）
  const remotePositions = [
    {
      trader: 'John',
      symbol: 'BTCUSD',
      status: 'open',
      entry: 45000,
      size: 0.5,
      tp: 50000,
      sl: 43000,
      syncTimestamp: new Date()
    },
    {
      trader: 'Eli',
      symbol: 'TAOUSD',
      status: 'open',
      entry: 228,
      size: 10.5,  // ❌ 不一致！本地是 10
      tp: 250,
      sl: 205,
      syncTimestamp: new Date()
    },
    {
      trader: 'Woods',
      symbol: 'SOLUSD',
      status: 'open',
      entry: 120,
      size: 5,
      tp: 150,
      sl: 100,
      syncTimestamp: new Date()
      // ❌ 本地缺失这个仓位！
    }
  ];

  console.log('\n【远程仓位（active_future_channel）】');
  remotePositions.forEach(pos => {
    console.log(`  ${pos.trader}: ${pos.symbol} @ ${pos.entry} (仓位: ${pos.size}, TP: ${pos.tp}, SL: ${pos.sl})`);
  });

  // 执行对比
  console.log('\n【执行对比】\n');
  const syncResult = positionSyncService.comparePositions(localPositions, remotePositions);

  // 显示结果
  console.log(`✅ 一致的仓位: ${syncResult.synced.length}`);
  syncResult.synced.forEach(pos => {
    console.log(`  ✓ ${pos.trader}: ${pos.symbol}`);
  });

  console.log(`\n⚠️ 不一致的仓位: ${syncResult.discrepancies.length}`);
  syncResult.discrepancies.forEach(disc => {
    console.log(`  ❌ ${disc.local.trader}: ${disc.local.symbol}`);
    console.log(`     本地仓位: ${disc.local.size}, 远程仓位: ${disc.remote.size}`);
  });

  console.log(`\n🆕 本地缺失的仓位: ${syncResult.missing.length}`);
  syncResult.missing.forEach(pos => {
    console.log(`  🔄 ${pos.trader}: ${pos.symbol} @ ${pos.entry} (需要创建)`);
  });

  console.log('\n═'.repeat(44));
  console.log('\n💡 同步策略：\n');
  console.log('1. 一致 ✅');
  console.log('   → 保持不变\n');

  console.log('2. 不一致 ⚠️');
  console.log('   → 发送 Telegram 告警');
  console.log('   → 人工审查\n');

  console.log('3. 本地缺失 🆕');
  console.log('   → 从远程同步创建仓位');
  console.log('   → 发送创建通知\n');

  console.log('═'.repeat(44));
  console.log('\n🔄 同步状态：\n');

  const status = positionSyncService.getSyncStatus();
  console.log(`  同步频道: ${status.syncChannel} (active_future_channel)`);
  console.log(`  同步间隔: ${status.syncInterval / 1000} 秒`);
  console.log(`  最后同步: ${status.lastSync || '未同步'}`);
  console.log(`  状态: ${status.isRunning ? '运行中' : '停止'}`);

  console.log('\n═'.repeat(44));
  console.log('\n📈 预期效果：\n');

  console.log('优势：');
  console.log('  ✓ 双向验证 - 确保数据准确性');
  console.log('  ✓ 自动修复 - 缺失仓位自动同步');
  console.log('  ✓ 实时告警 - 异常立即通知');
  console.log('  ✓ 延迟容限 - active_future_channel 有延迟，不用实时');
  console.log('  ✓ 人工干预 - 不一致时让人工审查\n');

  console.log('使用场景：');
  console.log('  1. 网络故障 → 重新同步缺失仓位');
  console.log('  2. 数据库错误 → 从频道恢复正确信息');
  console.log('  3. 多源输入 → 交易员直接在频道发仓位信息');
  console.log('  4. 审计跟踪 → 完整的仓位变化历史');

  console.log('\n═'.repeat(44));

  process.exit(0);
}

testPositionSync().catch(err => {
  console.error('❌ 测试失败:', err);
  process.exit(1);
});
