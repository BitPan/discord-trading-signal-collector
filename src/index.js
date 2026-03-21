/**
 * Discord Trading Signal Collector
 * 主入口文件
 */

const logger = require('./utils/logger');
const config = require('./config');
const ConfigValidator = require('./config/validator');
const APIService = require('./modules/api');
const connection = require('./modules/database/connection');
const telegramService = require('./modules/telegram/telegramService');
const discordClient = require('./modules/discord');
const tokenHealthCheck = require('./modules/discord/tokenHealthCheck');

async function main() {
  try {
    logger.info('Starting Discord Trading Signal Collector...', {
      environment: config.nodeEnv,
      port: config.api.port,
    });

    // 1. 验证配置
    ConfigValidator.validate(config);
    ConfigValidator.checkOptional(config);

    // 2. 初始化数据库连接
    await connection.initialize();

    // 3. 初始化 Telegram
    const telegramReady = await telegramService.testConnection();
    if (telegramReady) {
      logger.info('✅ Telegram bot connected');
    } else {
      logger.warn('⚠️ Telegram not available');
    }

    // 4. 启动 Token 健康检查
    await tokenHealthCheck.startHealthCheck();

    // 5. 初始化 Discord 连接（关键！这是之前缺失的）
    try {
      await discordClient.initialize();
      logger.info('✅ Discord client connected - now listening for signals');
    } catch (error) {
      logger.error('⚠️ Discord client failed to connect', {
        error: error.message,
      });
      logger.warn('Signals will not be received. Check Discord token and network connection.');
      // Discord 连接失败不阻止应用启动，但会影响信号接收
    }

    // 6. 启动 API 服务
    await APIService.start();

    logger.info('🚀 Application started successfully');

    // 7. 优雅关闭
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start application', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

async function shutdown() {
  logger.info('Shutting down gracefully...');
  try {
    await APIService.stop();
    await connection.close();
    
    // 关闭 Discord 连接
    if (discordClient && discordClient.disconnect) {
      await discordClient.disconnect();
    }
    
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = main;
