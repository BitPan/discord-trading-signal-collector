/**
 * Telegram 模块入口
 */

const alertService = require('./alertService');

class TelegramService {
  /**
   * 初始化
   */
  static async initialize() {
    await alertService.initialize();
  }

  /**
   * 发送告警
   */
  static async sendAlert(type, title, message, details = {}) {
    return alertService.sendAlert(type, title, message, details);
  }

  /**
   * Discord 告警
   */
  static async alertDiscordConnection(status, error = null) {
    return alertService.alertDiscordConnection(status, error);
  }

  /**
   * 消息同步告警
   */
  static async alertMessageSync(count, period) {
    return alertService.alertMessageSync(count, period);
  }

  /**
   * 信号告警
   */
  static async alertSignalGenerated(signal) {
    return alertService.alertSignalGenerated(signal);
  }

  /**
   * 数据库告警
   */
  static async alertDatabaseError(error) {
    return alertService.alertDatabaseError(error);
  }

  /**
   * 系统告警
   */
  static async alertSystemError(error, context = {}) {
    return alertService.alertSystemError(error, context);
  }

  /**
   * 健康检查告警
   */
  static async alertHealthCheck(status) {
    return alertService.alertHealthCheck(status);
  }

  /**
   * 获取状态
   */
  static getStatus() {
    return alertService.getStatus();
  }
}

module.exports = TelegramService;
