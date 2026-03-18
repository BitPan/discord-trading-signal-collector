/**
 * Discord Trading Signal Collector
 * 主入口文件
 *
 * 7×24 稳定运行的 Discord 交易信号收集系统
 */

const logger = require('./utils/logger');
const config = require('./config');

/**
 * 应用启动
 */
async function main() {
  try {
    logger.info('Starting Discord Trading Signal Collector...', {
      environment: config.nodeEnv,
      port: config.api.port,
    });

    // TODO: 初始化各个模块
    // 1. Discord Collector
    // 2. Database Service
    // 3. Signal Parser
    // 4. Position Manager
    // 5. REST API
    // 6. Health Monitor

    logger.info('Application started successfully');

    // 保持应用运行
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
    // TODO: 清理资源
    // - 关闭 Discord 连接
    // - 关闭数据库连接
    // - 停止 HTTP 服务器
    
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
main();

module.exports = main;
