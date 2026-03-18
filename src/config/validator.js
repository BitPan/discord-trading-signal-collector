/**
 * 配置验证器
 * 验证必需的环境变量
 */

const logger = require('../utils/logger');

class ConfigValidator {
  /**
   * 验证配置
   */
  static validate(config) {
    const errors = [];

    // Discord 必需配置
    if (!config.discord.botToken) {
      errors.push('DISCORD_BOT_TOKEN 未设置');
    }

    // 数据库必需配置
    if (!config.database.url) {
      errors.push('DATABASE_URL 未设置');
    }

    // API 配置
    if (config.api.port && (config.api.port < 1 || config.api.port > 65535)) {
      errors.push('API_PORT 必须在 1-65535 之间');
    }

    // 如果有错误，记录并抛出
    if (errors.length > 0) {
      const errorMessage = errors.join('\n  - ');
      logger.error('配置验证失败:\n  - ' + errorMessage);
      throw new Error('Invalid configuration');
    }

    logger.info('配置验证通过');
    return true;
  }

  /**
   * 警告未设置的可选配置
   */
  static checkOptional(config) {
    const warnings = [];

    if (!config.telegram.botToken) {
      warnings.push('TELEGRAM_BOT_TOKEN 未设置（告警功能不可用）');
    }

    warnings.forEach(warn => logger.warn(warn));
  }
}

module.exports = ConfigValidator;
