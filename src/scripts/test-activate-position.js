/**
 * 测试仓位激活功能
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api/v1';

async function testActivatePosition() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   测试仓位激活功能                      ║');
  console.log('╚════════════════════════════════════════╝\n');

  try {
    // Step 1: 创建测试仓位（pending）
    console.log('【Step 1】创建测试仓位（pending）');
    
    const createRes = await fetch(`${API_BASE}/positions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trader: 'test_trader_activate',
        symbol: 'BTCUSD',
        entry: 45000,
        size: 0.5,
        status: 'pending',
        order_type: 'pending'
      })
    });

    const createData = await createRes.json();
    if (!createRes.ok || !createData.data) {
      console.log('❌ 创建仓位失败');
      console.log(JSON.stringify(createData, null, 2));
      return;
    }

    const positionId = createData.data.id;
    console.log(`✅ 仓位已创建: ${positionId}`);
    console.log(`   订单类型: ${createData.data.order_type}`);
    console.log(`   状态: ${createData.data.status}\n`);

    // Step 2: 激活仓位
    console.log('【Step 2】激活仓位（pending → active）');
    
    const activateRes = await fetch(`${API_BASE}/positions/${positionId}/activate`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry: 45000,
        size: 0.5
      })
    });

    const activateData = await activateRes.json();
    if (!activateRes.ok) {
      console.log('❌ 激活仓位失败');
      console.log(JSON.stringify(activateData, null, 2));
      return;
    }

    console.log('✅ 仓位已激活');
    console.log(`   订单类型: ${activateData.data.order_type}`);
    console.log(`   状态: ${activateData.data.status}\n`);

    // Step 3: 验证状态
    console.log('【Step 3】验证仓位状态');
    
    const verifyRes = await fetch(`${API_BASE}/positions/${positionId}`);
    const verifyData = await verifyRes.json();

    if (verifyData.data.order_type === 'active' && verifyData.data.status === 'open') {
      console.log('✅ 状态验证成功');
      console.log(`   订单类型: ${verifyData.data.order_type}`);
      console.log(`   状态: ${verifyData.data.status}`);
    } else {
      console.log('❌ 状态验证失败');
      console.log(`   期望: order_type=active, status=open`);
      console.log(`   实际: order_type=${verifyData.data.order_type}, status=${verifyData.data.status}`);
    }

    console.log('\n═'.repeat(40));
    console.log('✅ 所有测试通过！');
    console.log('═'.repeat(40));

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }

  process.exit(0);
}

testActivatePosition();
