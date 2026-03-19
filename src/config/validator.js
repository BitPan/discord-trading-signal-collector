/**
 * 配置验证器
 */

const logger = require('../utils/logger');

class ConfigValidator {
  static validate(config) {
    const errors = [];

    // 数据库必需配置
    if (!config.database.url) {
      errors.push('DATABASE_URL 未设置');
    }

    // API 配置
    if (config.api.port && (config.api.port < 1 || config.api.port > 65535)) {
      errors.push('API_PORT 必须在 1-65535 之间');
    }

    if (errors.length > 0) {
      logger.error('配置验证失败: ' + errors.join(', '));
      throw new Error('Invalid configuration');
    }

    logger.info('配置验证通过');
    return true;
  }

  static checkOptional(config) {
    if (!config.discord.userToken) {
      logger.warn('DISCORD_USER_TOKEN 未设置（Discord 采集功能不可用）');
    }
    if (!config.telegram.botToken) {
      logger.warn('TELEGRAM_BOT_TOKEN 未设置（告警功能不可用）');
    }
  }
}

module.exports = ConfigValidator;
