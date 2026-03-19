/**
 * Telegram 通知服务
 * 发送位置更新、交易信号等通知到Telegram
 */

const logger = require('../../utils/logger');
const config = require('../../config');

class TelegramService {
  constructor() {
    this.botToken = config.telegram.botToken;
    this.chatId = config.telegram.chatId;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  /**
   * 发送原始消息
   */
  async sendMessage(text, options = {}) {
    if (!this.botToken || !this.chatId) {
      logger.warn('Telegram not configured, skipping notification');
      return false;
    }

    try {
      const url = `${this.baseUrl}/sendMessage`;
      const payload = {
        chat_id: this.chatId,
        text: text,
        parse_mode: 'HTML',
        ...options
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        logger.warn(`Telegram API error: ${response.status}`);
        return false;
      }

      logger.info('Telegram message sent successfully');
      return true;
    } catch (error) {
      logger.error('Failed to send Telegram message', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * 通知：新建仓位
   */
  async notifyPositionOpened(position, signal) {
    const text = `
🎯 <b>新建仓位</b>

👤 交易员：<code>${position.trader}</code>
📊 交易对：<b>${position.symbol}</b>
📈 入场价：<code>${position.entry}</code>
💰 仓位：<code>${position.size}</code>
🎲 类型：OPEN

⏰ 时间：${new Date(position.created_at).toLocaleString('zh-CN')}
    `.trim();

    return this.sendMessage(text);
  }

  /**
   * 通知：设置 TP（获利）
   */
  async notifyTargetProfit(position, price) {
    const text = `
🎯 <b>设置获利点</b>

👤 交易员：<code>${position.trader}</code>
📊 交易对：<b>${position.symbol}</b>
🎯 目标价：<code>${price}</code>

⏰ 时间：${new Date().toLocaleString('zh-CN')}
    `.trim();

    return this.sendMessage(text);
  }

  /**
   * 通知：设置 SL（止损）
   */
  async notifyStopLoss(position, price) {
    const text = `
⚠️ <b>设置止损点</b>

👤 交易员：<code>${position.trader}</code>
📊 交易对：<b>${position.symbol}</b>
🛑 止损价：<code>${price}</code>

⏰ 时间：${new Date().toLocaleString('zh-CN')}
    `.trim();

    return this.sendMessage(text);
  }

  /**
   * 通知：平仓
   */
  async notifyPositionClosed(position) {
    const pnl = position.pnl || 0;
    const pnlPercent = position.pnl_percent || 0;
    const emoji = pnl >= 0 ? '📈 赚' : '📉 亏';
    
    const text = `
✅ <b>仓位已平仓</b>

👤 交易员：<code>${position.trader}</code>
📊 交易对：<b>${position.symbol}</b>
💵 入场价：<code>${position.entry}</code>
💵 平仓价：<code>${position.exit}</code>
💰 仓位：<code>${position.size}</code>

${emoji} PnL：<b>${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}</b> (${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)

⏰ 时间：${new Date(position.updated_at).toLocaleString('zh-CN')}
    `.trim();

    return this.sendMessage(text);
  }

  /**
   * 通知：系统告警
   */
  async notifyAlert(title, message, severity = 'warning') {
    const emoji = {
      'error': '❌',
      'warning': '⚠️',
      'info': 'ℹ️'
    }[severity] || 'ℹ️';

    const text = `
${emoji} <b>${title}</b>

${message}

⏰ 时间：${new Date().toLocaleString('zh-CN')}
    `.trim();

    return this.sendMessage(text);
  }

  /**
   * 测试连接
   */
  async testConnection() {
    try {
      const url = `${this.baseUrl}/getMe`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.ok) {
        logger.info('Telegram bot connected successfully', {
          botName: data.result.username
        });
        return true;
      } else {
        logger.error('Telegram bot error:', { error: data.description });
        return false;
      }
    } catch (error) {
      logger.error('Failed to test Telegram connection', {
        error: error.message
      });
      return false;
    }
  }
}

module.exports = new TelegramService();
