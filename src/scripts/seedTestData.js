/**
 * 测试数据生成脚本
 */

const connection = require('../modules/database/connection');
const logger = require('../utils/logger');

async function seedTestData() {
  try {
    logger.info('Starting test data seeding...');

    // 1. 插入测试消息
    logger.info('Inserting test messages...');
    const messages = [
      {
        id: `msg_${Date.now()}_1`,
        discord_user_id: '843376150285910047',
        discord_username: 'achen886',
        channel_id: '1237622911393730632',
        content: 'OPEN BTCUSD 45000 0.5 TP:50000,55000 SL:40000',
      },
      {
        id: `msg_${Date.now()}_2`,
        discord_user_id: '843376150285910047',
        discord_username: 'achen886',
        channel_id: '743220645852086333',
        content: 'OPEN ETHUSD 2500 1.0',
      },
      {
        id: `msg_${Date.now()}_3`,
        discord_user_id: '123456789',
        discord_username: 'trader_john',
        channel_id: '767805453517979649',
        content: 'CLOSE BTCUSD',
      },
    ];

    for (const msg of messages) {
      const query = `INSERT INTO messages 
        (id, discord_user_id, discord_username, channel_id, content, 
         created_at, fetched_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (id, channel_id) DO NOTHING`;
      await connection.query(query, [
        msg.id,
        msg.discord_user_id,
        msg.discord_username,
        msg.channel_id,
        msg.content,
      ]);
    }
    logger.info(`Inserted ${messages.length} test messages`);

    logger.info('✅ Test data seeding completed!');
    process.exit(0);
  } catch (error) {
    logger.error('Test data seeding failed:', { error: error.message });
    process.exit(1);
  }
}

seedTestData();
