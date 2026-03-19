/**
 * 仓位同步和验证服务
 * 从 active_future_channel 读取所有交易员的仓位状态
 * 用于验证和同步数据库中的仓位
 */

const logger = require('../../utils/logger');
const config = require('../../config');
const telegramService = require('../telegram/telegramService');
const PositionRepository = require('../database/repositories/PositionRepository');

class PositionSyncService {
  constructor() {
    this.syncChannelId = '1237622911393730632'; // active_future_channel
    this.syncInterval = 60000; // 60 秒一次同步
    this.lastSyncTime = null;
  }

  /**
   * 启动定期同步
   */
  startPeriodicSync() {
    logger.info('Starting periodic position sync', {
      channelId: this.syncChannelId,
      interval: this.syncInterval
    });

    // 立即执行一次
    this.syncPositions();

    // 定期执行
    setInterval(() => {
      this.syncPositions().catch(err => {
        logger.error('Periodic sync failed', { error: err.message });
      });
    }, this.syncInterval);
  }

  /**
   * 执行仓位同步
   */
  async syncPositions() {
    try {
      logger.info('Starting position sync from active_future_channel...');

      // 这里需要 Discord 连接
      // 从频道读取最近的消息
      const channelMessages = await this.fetchChannelPositions();

      if (channelMessages.length === 0) {
        logger.warn('No messages fetched from sync channel');
        return;
      }

      // 解析仓位信息
      const remotePositions = this.parsePositionMessages(channelMessages);

      logger.info('Fetched positions from channel', {
        count: remotePositions.length,
        traders: [...new Set(remotePositions.map(p => p.trader))]
      });

      // 与数据库比较
      const localPositions = await PositionRepository.findAll();

      // 执行对比和验证
      const syncResult = this.comparePositions(localPositions, remotePositions);

      // 处理差异
      await this.handleDifferences(syncResult);

      this.lastSyncTime = new Date();

      logger.info('Position sync completed', {
        synced: syncResult.synced.length,
        missing: syncResult.missing.length,
        discrepancies: syncResult.discrepancies.length,
        lastSync: this.lastSyncTime
      });

    } catch (error) {
      logger.error('Position sync failed', {
        error: error.message,
        stack: error.stack
      });

      // 发送告警
      await telegramService.notifyAlert(
        '仓位同步失败',
        `无法从 active_future_channel 同步仓位。错误: ${error.message}`,
        'error'
      );
    }
  }

  /**
   * 从 Discord 频道获取消息（模拟）
   */
  async fetchChannelPositions() {
    // 实际实现中，这里会调用 Discord API
    // 获取最近 100 条消息
    logger.info('Fetching messages from sync channel...');

    // 返回模拟数据（实际会从 Discord 获取）
    return [];
  }

  /**
   * 解析仓位消息
   * 格式: "[TRADER] SYMBOL: ENTRY PRICE, SIZE, STATUS (TP: XX, SL: XX)"
   */
  parsePositionMessages(messages) {
    const positions = [];

    messages.forEach(msg => {
      // 尝试解析位置信息
      // 格式示例：
      // "John: BTCUSD open 45000 0.5 TP:50000 SL:43000"
      // "Eli: TAOUSD open 228 10 TP:250 SL:205"

      const positionRegex = /([A-Za-z0-9_]+):\s*([A-Z]{2,}USD?)\s+(open|closed|pending)\s+([\d.]+)\s+([\d.]+)\s+TP:\s*([\d.]+)?\s+SL:\s*([\d.]+)?/gi;

      let match;
      while ((match = positionRegex.exec(msg.content || '')) !== null) {
        positions.push({
          trader: match[1],
          symbol: match[2],
          status: match[3],
          entry: parseFloat(match[4]),
          size: parseFloat(match[5]),
          tp: match[6] ? parseFloat(match[6]) : null,
          sl: match[7] ? parseFloat(match[7]) : null,
          syncTimestamp: new Date(msg.timestamp || Date.now()),
          source: 'channel_sync'
        });
      }
    });

    return positions;
  }

  /**
   * 对比本地和远程仓位
   */
  comparePositions(localPositions, remotePositions) {
    const result = {
      synced: [],      // 一致的仓位
      missing: [],     // 本地缺失（需要创建）
      discrepancies: [] // 不一致（需要更新）
    };

    // 检查本地缺失的仓位
    remotePositions.forEach(remote => {
      const localMatch = localPositions.find(
        l => l.trader === remote.trader && 
             l.symbol === remote.symbol && 
             l.status === remote.status &&
             Math.abs(l.entry - remote.entry) < 0.01 // 允许小数点误差
      );

      if (!localMatch) {
        result.missing.push(remote);
      } else {
        // 检查是否有其他差异
        if (Math.abs(localMatch.size - remote.size) > 0.001 ||
            (remote.tp && Math.abs(localMatch.tp - remote.tp) > 0.01) ||
            (remote.sl && Math.abs(localMatch.sl - remote.sl) > 0.01)) {
          result.discrepancies.push({
            local: localMatch,
            remote: remote
          });
        } else {
          result.synced.push(localMatch);
        }
      }
    });

    return result;
  }

  /**
   * 处理仓位差异
   */
  async handleDifferences(syncResult) {
    // 处理缺失的仓位（创建新仓位）
    for (const missing of syncResult.missing) {
      try {
        logger.info('Creating missing position from sync', {
          trader: missing.trader,
          symbol: missing.symbol
        });

        const newPosition = {
          id: `pos_sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          trader: missing.trader,
          symbol: missing.symbol,
          status: missing.status,
          entry: missing.entry,
          size: missing.size,
          tp: missing.tp,
          sl: missing.sl,
          created_at: missing.syncTimestamp,
          source: 'channel_sync'
        };

        await PositionRepository.create(newPosition);

        logger.info('Missing position created', {
          positionId: newPosition.id
        });

        // 发送通知
        await telegramService.notifyAlert(
          '仓位同步创建',
          `从 active_future_channel 同步新仓位: ${missing.trader} ${missing.symbol} @ ${missing.entry}`,
          'info'
        );
      } catch (error) {
        logger.error('Failed to create missing position', {
          error: error.message,
          position: missing
        });
      }
    }

    // 处理不一致的仓位（更新）
    for (const discrepancy of syncResult.discrepancies) {
      logger.warn('Position discrepancy detected', {
        trader: discrepancy.local.trader,
        symbol: discrepancy.local.symbol,
        local: {
          size: discrepancy.local.size,
          tp: discrepancy.local.tp,
          sl: discrepancy.local.sl
        },
        remote: {
          size: discrepancy.remote.size,
          tp: discrepancy.remote.tp,
          sl: discrepancy.remote.sl
        }
      });

      // 发送告警
      await telegramService.notifyAlert(
        '仓位数据不一致',
        `${discrepancy.local.trader} 的 ${discrepancy.local.symbol} 仓位数据不一致。本地: 仓位 ${discrepancy.local.size}, 远程: ${discrepancy.remote.size}`,
        'warning'
      );
    }
  }

  /**
   * 获取同步状态
   */
  getSyncStatus() {
    return {
      lastSync: this.lastSyncTime,
      syncChannel: this.syncChannelId,
      syncInterval: this.syncInterval,
      isRunning: true
    };
  }
}

module.exports = new PositionSyncService();
