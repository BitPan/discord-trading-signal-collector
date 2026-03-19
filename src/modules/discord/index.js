/**
 * Discord 模块入口
 */

const userClient = require('./userClient');
const messageSyncService = require('./messageSyncService');
const logger = require('../../utils/logger');

class DiscordService {
  /**
   * 初始化 Discord 服务
   */
  static async initialize() {
    try {
      logger.info('Initializing Discord service...');

      // 初始化用户客户端
      await userClient.initialize();

      // 启动消息同步
      await messageSyncService.start();

      logger.info('Discord service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Discord service', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 获取服务统计
   */
  static getStats() {
    return messageSyncService.getStats();
  }

  /**
   * 关闭 Discord 服务
   */
  static async close() {
    await messageSyncService.stop();
  }
}

module.exports = DiscordService;
