/**
 * 消息处理服务
 * 将收到的 Discord 消息转换为信号候选
 */

const logger = require('../../utils/logger');
const directCommandParser = require('./directCommandParser');
const messageValidator = require('./messageValidator');
const SignalRepository = require('../database/repositories/SignalRepository');
const TraderRepository = require('../database/repositories/TraderRepository');
const EventRepository = require('../database/repositories/EventRepository');

class MessageProcessService {
  constructor() {
    this.processedCount = 0;
    this.signalCount = 0;
  }

  /**
   * 处理消息
   */
  async processMessage(message) {
    try {
      // 1. 验证消息
      const validation = messageValidator.validate(message);
      if (!validation.valid) {
        logger.warn('Message validation failed', {
          messageId: message.id,
          errors: validation.errors,
        });
        return null;
      }

      this.processedCount++;

      // 2. 检查是否是交易消息
      if (!messageValidator.isTradeMessage(message.content)) {
        logger.debug('Not a trade message', {
          messageId: message.id,
        });
        return null;
      }

      // 3. 规范化内容
      const normalizedContent = messageValidator.normalize(message.content);

      // 4. 尝试解析直接命令
      const signal = directCommandParser.parse(normalizedContent);

      if (!signal) {
        logger.debug('No signal parsed from message', {
          messageId: message.id,
        });
        return null;
      }

      // 5. 生成交易员 ID（基于 Discord 用户 ID）
      const traderId = `trader_${message.userId}`;

      // 6. 创建或获取交易员
      await TraderRepository.findOrCreate({
        id: traderId,
        discord_user_id: message.userId,
        username: message.username,
      });

      // 7. 保存信号到数据库
      const savedSignal = await SignalRepository.create({
        id: `signal_${message.id}_${Date.now()}`,
        message_ids: [message.id],
        type: signal.type,
        trader: traderId,
        symbol: signal.symbol,
        action: signal.action,
        entry: signal.entry || null,
        size: signal.size || null,
        tp: signal.tp || [],
        sl: signal.sl || [],
        direction: signal.direction || null,
        raw_data: signal.raw_data,
        confidence: signal.confidence,
      });

      this.signalCount++;

      logger.info('Signal created', {
        signalId: savedSignal.id,
        symbol: signal.symbol,
        action: signal.action,
        trader: traderId,
      });

      // 8. 记录事件
      await EventRepository.create({
        event_type: 'signal_parsed',
        entity_type: 'signal',
        entity_id: savedSignal.id,
        data: {
          messageId: message.id,
          channelId: message.channelId,
          traderId,
          symbol: signal.symbol,
          action: signal.action,
        },
      });

      return savedSignal;
    } catch (error) {
      logger.error('Failed to process message', {
        messageId: message.id,
        error: error.message,
      });

      // 记录错误事件
      try {
        await EventRepository.create({
          event_type: 'error',
          entity_type: 'message_processing',
          entity_id: message.id,
          error: {
            message: error.message,
            code: error.code,
          },
        });
      } catch (eventError) {
        logger.error('Failed to record error event', { error: eventError.message });
      }

      return null;
    }
  }

  /**
   * 批量处理消息
   */
  async processMessages(messages) {
    const results = [];

    for (const message of messages) {
      const result = await this.processMessage(message);
      if (result) {
        results.push(result);
      }
    }

    logger.info('Batch message processing completed', {
      processed: this.processedCount,
      signals: this.signalCount,
      batch_size: messages.length,
    });

    return results;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      processedCount: this.processedCount,
      signalCount: this.signalCount,
      conversionRate: this.processedCount > 0
        ? ((this.signalCount / this.processedCount) * 100).toFixed(2) + '%'
        : '0%',
    };
  }
}

module.exports = new MessageProcessService();
