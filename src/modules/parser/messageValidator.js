/**
 * 消息验证器
 * 验证消息是否符合预期格式
 */

const logger = require('../../utils/logger');

class MessageValidator {
  /**
   * 验证消息
   */
  validate(message) {
    const errors = [];

    // 检查必需字段
    if (!message.content || typeof message.content !== 'string') {
      errors.push('Content is required');
    }

    if (!message.channelId) {
      errors.push('Channel ID is required');
    }

    if (!message.userId) {
      errors.push('User ID is required');
    }

    // 检查消息长度
    if (message.content && message.content.length > 2000) {
      errors.push('Content exceeds Discord limit (2000 chars)');
    }

    // 检查空白消息
    if (message.content && message.content.trim().length === 0) {
      errors.push('Content is empty');
    }

    if (errors.length > 0) {
      logger.warn('Message validation failed', {
        messageId: message.id,
        errors,
      });
      return {
        valid: false,
        errors,
      };
    }

    return {
      valid: true,
      errors: [],
    };
  }

  /**
   * 检查是否是有效的交易消息
   */
  isTradeMessage(content) {
    if (!content) {
      return false;
    }

    const text = content.toUpperCase();

    // 检查是否包含交易关键词
    const tradeKeywords = ['OPEN', 'CLOSE', 'BUY', 'SELL', 'LONG', 'SHORT', 'EXIT'];
    return tradeKeywords.some(kw => text.includes(kw));
  }

  /**
   * 规范化消息内容
   */
  normalize(content) {
    return content
      .trim()
      .replace(/\s+/g, ' ')  // 多个空格变单个
      .replace(/[\n\r]+/g, ' ');  // 换行变空格
  }
}

module.exports = new MessageValidator();
