/**
 * Discord Trading Signal Collector
 * 主入口文件
 *
 * 7×24 稳定运行的 Discord 交易信号收集系统
 */

const logger = require('./utils/logger');
const config = require('./config');
const ConfigValidator = require('./config/validator');
const APIService = require('./modules/api');

/**
 * 应用启动
 */
async function main() {
  try {
    logger.info('Starting Discord Trading Signal Collector...', {
      environment: config.nodeEnv,
      port: config.api.port,
      database: config.database.url.substring(0, 30) + '...',
    });

    // 1. 验证配置
    ConfigValidator.validate(config);
    ConfigValidator.checkOptional(config);

    // 2. 初始化数据库（可选，看是否需要自动创建表）
    // const db = await DatabaseService.initialize();

    // 3. 启动 API 服务
    await APIService.start();

    logger.info('Application started successfully', {
      modules: ['api', 'database', 'logger'],
    });

    // 4. 设置信号处理（优雅关闭）
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

/**
 * 优雅关闭
 */
async function shutdown() {
  logger.info('Shutting down gracefully...');

  try {
    // 1. 停止 API 服务
    await APIService.stop();

    // 2. 关闭数据库连接
    // await DatabaseService.close();

    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', {
      error: error.message,
    });
    process.exit(1);
  }
}

// 启动应用
if (require.main === module) {
  main();
}

module.exports = main;
