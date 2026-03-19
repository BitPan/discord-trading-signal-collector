/**
 * Discord User Client
 * 使用用户账户 Token 连接到 Discord
 * 支持监听多个频道和同步历史消息
 */

const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config');

class DiscordUserClient {
  constructor() {
    this.client = null;
    this.connected = false;
    this.channels = [];
  }

  /**
   * 初始化连接
   */
  async initialize() {
    try {
      logger.info('Initializing Discord User Client...', {
        userId: config.discord.userId,
        serverId: config.discord.targetServerId,
        channels: config.discord.channels.length,
      });

      // 创建 Client（支持用户账户）
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.DirectMessages,
          GatewayIntentBits.MessageContent,
        ],
      });

      // 设置事件监听
      this.setupEventHandlers();

      // 连接到 Discord
      await this.client.login(config.discord.userToken);

      // 等待 ready 事件
      await new Promise((resolve) => {
        this.client.once('ready', () => {
          logger.info('Discord User Client connected', {
            username: this.client.user.username,
            id: this.client.user.id,
          });
          resolve();
        });
      });

      // 获取目标频道
      await this.fetchChannels();

      this.connected = true;
      logger.info('Discord User Client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Discord User Client', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 设置事件处理
   */
  setupEventHandlers() {
    // 消息事件
    this.client.on('messageCreate', (message) => {
      this.handleMessageCreate(message);
    });

    // 错误处理
    this.client.on('error', (error) => {
      logger.error('Discord client error', { error: error.message });
    });

    // 重连事件
    this.client.on('shardReconnecting', () => {
      logger.warn('Discord client reconnecting...');
    });
  }

  /**
   * 获取目标频道
   */
  async fetchChannels() {
    try {
      const server = await this.client.guilds.fetch(config.discord.targetServerId);

      for (let i = 0; i < config.discord.channels.length; i++) {
        const channelId = config.discord.channels[i];
        const label = config.discord.channelLabels[i] || `channel_${i}`;

        try {
          const channel = await server.channels.fetch(channelId);

          if (channel && channel.type === ChannelType.GuildText) {
            this.channels.push({
              id: channelId,
              name: channel.name,
              label,
              channelObj: channel,
            });

            logger.info('Channel fetched', {
              channelId,
              name: channel.name,
              label,
            });
          }
        } catch (error) {
          logger.error('Failed to fetch channel', {
            channelId,
            error: error.message,
          });
        }
      }

      logger.info('All channels fetched', {
        count: this.channels.length,
      });
    } catch (error) {
      logger.error('Failed to fetch target server', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 处理新消息
   */
  handleMessageCreate(message) {
    // 跳过自己的消息
    if (message.author.id === this.client.user.id) {
      return;
    }

    // 检查是否是目标频道
    if (!config.discord.channels.includes(message.channelId)) {
      return;
    }

    logger.info('Message received', {
      channelId: message.channelId,
      userId: message.author.id,
      username: message.author.username,
      contentLength: message.content.length,
    });

    // 触发自定义事件
    this.client.emit('targetMessage', {
      id: message.id,
      channelId: message.channelId,
      userId: message.author.id,
      username: message.author.username,
      content: message.content,
      attachments: message.attachments.map(a => ({
        id: a.id,
        url: a.url,
        name: a.name,
      })),
      createdAt: message.createdAt,
      updatedAt: message.editedAt,
    });
  }

  /**
   * 同步历史消息
   */
  async syncHistoryMessages(onMessage) {
    try {
      logger.info('Starting history message sync...', {
        channels: this.channels.length,
        days: config.discord.syncHistoryDays,
      });

      const since = new Date(Date.now() - config.discord.syncHistoryDays * 24 * 60 * 60 * 1000);

      for (const channel of this.channels) {
        await this.syncChannelHistory(channel, since, onMessage);
      }

      logger.info('History message sync completed');
    } catch (error) {
      logger.error('Failed to sync history messages', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 同步单个频道的历史消息
   */
  async syncChannelHistory(channel, since, onMessage) {
    try {
      logger.info('Syncing channel history', {
        channelId: channel.id,
        name: channel.name,
      });

      let fetchedCount = 0;
      let lastMessageId = null;
      let shouldContinue = true;

      while (shouldContinue) {
        const options = {
          limit: config.discord.messageBatchSize,
          after: lastMessageId,
        };

        const messages = await channel.channelObj.messages.fetch(options);

        if (messages.size === 0) {
          shouldContinue = false;
          break;
        }

        for (const [msgId, msg] of messages) {
          if (msg.createdAt < since) {
            logger.info('Reached history limit', {
              channelId: channel.id,
              fetchedCount,
            });
            shouldContinue = false;
            break;
          }

          // 回调处理消息
          if (onMessage) {
            await onMessage({
              id: msg.id,
              channelId: msg.channelId,
              userId: msg.author.id,
              username: msg.author.username,
              content: msg.content,
              attachments: msg.attachments.map(a => ({
                id: a.id,
                url: a.url,
                name: a.name,
              })),
              createdAt: msg.createdAt,
              updatedAt: msg.editedAt,
            });
          }

          fetchedCount++;
          lastMessageId = msgId;
        }
      }

      logger.info('Channel history synced', {
        channelId: channel.id,
        fetchedCount,
      });
    } catch (error) {
      logger.error('Failed to sync channel history', {
        channelId: channel.id,
        error: error.message,
      });
    }
  }

  /**
   * 获取频道信息
   */
  getChannels() {
    return this.channels;
  }

  /**
   * 检查是否连接
   */
  isConnected() {
    return this.connected && this.client && this.client.isReady();
  }

  /**
   * 断开连接
   */
  async disconnect() {
    if (this.client) {
      await this.client.destroy();
      this.connected = false;
      logger.info('Discord User Client disconnected');
    }
  }
}

module.exports = new DiscordUserClient();
