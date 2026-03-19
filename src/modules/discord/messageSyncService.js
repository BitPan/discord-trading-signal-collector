/**
 * 消息同步服务
 * 从 Discord 获取消息，保存到数据库
 */

const logger = require('../../utils/logger');
const config = require('../../config');
const userClient = require('./userClient');
const MessageRepository = require('../database/repositories/MessageRepository');
const EventRepository = require('../database/repositories/EventRepository');

class MessageSyncService {
  constructor() {
    this.syncInterval = null;
    this.isSyncing = false;
    this.totalMessages = 0;
    this.lastSyncTime = null;
  }

  /**
   * 启动消息同步
   */
  async start() {
    try {
      logger.info('Starting message sync service...', {
        interval: config.discord.syncIntervalSeconds,
        channels: config.discord.channels.length,
      });

      // 首先同步历史消息
      await userClient.syncHistoryMessages(this.handleMessage.bind(this));

      // 然后设置定时同步
      this.setupPeriodicSync();

      // 监听实时消息
      userClient.client.on('targetMessage', (message) => {
        this.handleMessage(message);
      });

      logger.info('Message sync service started');
    } catch (error) {
      logger.error('Failed to start message sync service', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 处理消息
   */
  async handleMessage(message) {
    if (this.isSyncing) {
      return;
    }

    try {
      // 保存到数据库
      await MessageRepository.create({
        id: message.id,
        discord_user_id: message.userId,
        discord_username: message.username,
        channel_id: message.channelId,
        content: message.content,
        attachments: message.attachments,
      });

      logger.debug('Message saved', {
        messageId: message.id,
        channelId: message.channelId,
      });

      this.totalMessages++;

      // 记录事件
      await EventRepository.create({
        event_type: 'message_fetched',
        entity_type: 'message',
        entity_id: message.id,
        data: {
          channelId: message.channelId,
          userId: message.userId,
          contentLength: message.content.length,
        },
      });
    } catch (error) {
      logger.error('Failed to handle message', {
        messageId: message.id,
        error: error.message,
      });

      // 记录错误事件
      try {
        await EventRepository.create({
          event_type: 'error',
          entity_type: 'message',
          entity_id: message.id,
          error: {
            message: error.message,
            code: error.code,
          },
        });
      } catch (eventError) {
        logger.error('Failed to record error event', { error: eventError.message });
      }
    }
  }

  /**
   * 设置定时同步
   */
  setupPeriodicSync() {
    this.syncInterval = setInterval(async () => {
      if (this.isSyncing) {
        return;
      }

      this.isSyncing = true;

      try {
        logger.info('Periodic sync triggered', {
          interval: config.discord.syncIntervalSeconds,
        });

        // 这里可以添加增量同步逻辑
        this.lastSyncTime = new Date();
      } catch (error) {
        logger.error('Periodic sync failed', {
          error: error.message,
        });
      } finally {
        this.isSyncing = false;
      }
    }, config.discord.syncIntervalSeconds * 1000);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalMessages: this.totalMessages,
      lastSyncTime: this.lastSyncTime,
      isConnected: userClient.isConnected(),
      channels: userClient.getChannels().length,
    };
  }

  /**
   * 停止同步
   */
  async stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    await userClient.disconnect();

    logger.info('Message sync service stopped', {
      totalMessages: this.totalMessages,
    });
  }
}

module.exports = new MessageSyncService();
