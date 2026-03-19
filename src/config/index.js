/**
 * 应用配置
 */

require('dotenv').config();

const config = {
  // 应用信息
  nodeEnv: process.env.NODE_ENV || 'development',
  appName: 'Discord Trading Signal Collector',

  // Discord 配置
  discord: {
    userToken: process.env.DISCORD_USER_TOKEN,
    userId: process.env.DISCORD_USER_ID,
    targetServerId: process.env.DISCORD_TARGET_SERVER_ID,
    targetServerName: process.env.DISCORD_TARGET_SERVER_NAME,
    // 频道列表
    channels: (process.env.DISCORD_CHANNELS || '').split(',').filter(c => c),
    channelLabels: (process.env.DISCORD_CHANNEL_LABELS || '').split(',').filter(c => c),
    // 同步配置
    syncHistoryDays: parseInt(process.env.DISCORD_SYNC_HISTORY_DAYS) || 30,
    syncIntervalSeconds: parseInt(process.env.DISCORD_SYNC_INTERVAL_SECONDS) || 60,
    messageBatchSize: parseInt(process.env.DISCORD_MESSAGE_BATCH_SIZE) || 100,
  },

  // 数据库配置
  database: {
    url: process.env.DATABASE_URL,
    pool: {
      min: parseInt(process.env.DATABASE_POOL_MIN) || 2,
      max: parseInt(process.env.DATABASE_POOL_MAX) || 20,
    },
  },

  // API 配置
  api: {
    port: parseInt(process.env.API_PORT) || 3000,
    host: process.env.API_HOST || 'localhost',
  },

  // Telegram 配置（可选）
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },

  // 日志配置
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs',
  },
};

module.exports = config;
