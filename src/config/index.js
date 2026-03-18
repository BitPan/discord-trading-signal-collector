/**
 * 应用配置管理
 */

require('dotenv').config();

module.exports = {
  // 环境
  nodeEnv: process.env.NODE_ENV || 'development',

  // Discord
  discord: {
    botToken: process.env.DISCORD_BOT_TOKEN,
    channels: (process.env.DISCORD_CHANNELS || '').split(',').filter(Boolean),
    users: (process.env.DISCORD_USERS || '').split(',').filter(Boolean),
    lookbackDays: parseInt(process.env.DISCORD_LOOKBACK_DAYS || '30'),
  },

  // 数据库
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost/trading',
    backupInterval: parseInt(process.env.DATABASE_BACKUP_INTERVAL || '3600'),
  },

  // Telegram 告警
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    alertChatId: process.env.TELEGRAM_ALERT_CHAT_ID,
  },

  // API
  api: {
    port: parseInt(process.env.API_PORT || '3000'),
    authKey: process.env.API_AUTH_KEY || 'dev-key',
  },

  // 日志
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
