/**
 * Telegram 告警服务
 * 发送重要事件通知
 */

const logger = require('../../utils/logger');
const config = require('../../config');

class TelegramAlertService {
  constructor() {
    this.enabled = !!(config.telegram.botToken && config.telegram.chatId);
    this.alertQueue = [];
    this.sending = false;
  }

  /**
   * 初始化
   */
  async initialize() {
    if (!this.enabled) {
      logger.warn('Telegram alerting disabled - no botToken or chatId configured');
      return;
    }

    logger.info('Telegram alert service initialized', {
      chatId: config.telegram.chatId,
    });
  }

  /**
   * 发送告警
   */
  async sendAlert(type, title, message, details = {}) {
    if (!this.enabled) {
      logger.debug('Alert not sent - Telegram disabled', { type, title });
      return false;
    }

    try {
      const alert = {
        type,
        title,
        message,
        details,
        timestamp: new Date().toISOString(),
      };

      // 格式化消息
      const formattedMessage = this.formatAlertMessage(alert);

      logger.info('Alert queued', {
        type,
        title,
      });

      // 这里应该调用实际的 Telegram API
      // 目前只做日志记录
      logger.debug('Alert formatted', {
        message: formattedMessage,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send alert', {
        type,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Discord 连接告警
   */
  async alertDiscordConnection(status, error = null) {
    const type = status === 'connected' ? 'info' : 'error';
    const title = status === 'connected' 
      ? '✅ Discord 已连接'
      : '❌ Discord 连接失败';

    return this.sendAlert(type, title, error ? error.message : 'Connection restored', {
      service: 'discord',
      status,
    });
  }

  /**
   * 消息同步告警
   */
  async alertMessageSync(count, period) {
    return this.sendAlert('info', '📨 消息同步完成', `已同步 ${count} 条消息`, {
      service: 'message_sync',
      count,
      period,
    });
  }

  /**
   * 信号生成告警
   */
  async alertSignalGenerated(signal) {
    const message = `${signal.action.toUpperCase()} ${signal.symbol} @ ${signal.entry || 'N/A'}`;
    
    return this.sendAlert('success', '🎯 新交易信号', message, {
      service: 'signal_parser',
      symbol: signal.symbol,
      action: signal.action,
      entry: signal.entry,
    });
  }

  /**
   * 数据库错误告警
   */
  async alertDatabaseError(error) {
    return this.sendAlert('error', '🚨 数据库错误', error.message, {
      service: 'database',
      error: error.message,
    });
  }

  /**
   * 系统错误告警
   */
  async alertSystemError(error, context = {}) {
    return this.sendAlert('error', '⚠️ 系统错误', error.message, {
      service: 'system',
      context,
      error: error.message,
    });
  }

  /**
   * 健康检查告警
   */
  async alertHealthCheck(status) {
    if (status.healthy) {
      return this.sendAlert('info', '✅ 系统状态良好', 
        `运行时间: ${status.uptime}秒`, status);
    } else {
      return this.sendAlert('error', '❌ 系统异常', 
        `异常项: ${status.issues.join(', ')}`, status);
    }
  }

  /**
   * 格式化告警消息
   */
  formatAlertMessage(alert) {
    const lines = [
      `【${alert.type.toUpperCase()}】`,
      `标题: ${alert.title}`,
      `消息: ${alert.message}`,
      `时间: ${alert.timestamp}`,
    ];

    if (Object.keys(alert.details).length > 0) {
      lines.push('详情:');
      for (const [key, value] of Object.entries(alert.details)) {
        lines.push(`  ${key}: ${JSON.stringify(value)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      enabled: this.enabled,
      queueLength: this.alertQueue.length,
      sending: this.sending,
    };
  }
}

module.exports = new TelegramAlertService();
