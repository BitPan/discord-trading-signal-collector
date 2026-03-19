/**
 * 仓位管理器
 * 管理交易仓位的完整生命周期
 */

const logger = require('../../utils/logger');
const PositionRepository = require('../database/repositories/PositionRepository');
const EventRepository = require('../database/repositories/EventRepository');

class PositionManager {
  constructor() {
    this.activePositions = new Map();
  }

  /**
   * 从信号创建仓位
   */
  async createPositionFromSignal(signal) {
    try {
      // 只处理 OPEN 信号
      if (signal.action !== 'open') {
        logger.debug('Ignoring non-open signal', {
          signalId: signal.id,
          action: signal.action,
        });
        return null;
      }

      const positionId = `pos_${signal.id}_${Date.now()}`;

      const position = await PositionRepository.create({
        id: positionId,
        trader: signal.trader,
        symbol: signal.symbol,
        status: 'pending',  // 初始状态为 pending
        entry: signal.entry,
        size: signal.size,
        tp: signal.tp || [],
        sl: signal.sl || [],
        signal_ids: [signal.id],
      });

      this.activePositions.set(positionId, position);

      logger.info('Position created from signal', {
        positionId,
        symbol: signal.symbol,
        entry: signal.entry,
        size: signal.size,
      });

      // 记录事件
      await EventRepository.create({
        event_type: 'position_created',
        entity_type: 'position',
        entity_id: positionId,
        data: {
          signalId: signal.id,
          symbol: signal.symbol,
          entry: signal.entry,
        },
      });

      return position;
    } catch (error) {
      logger.error('Failed to create position from signal', {
        signalId: signal.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 打开仓位（从 pending 状态转移到 open）
   */
  async openPosition(positionId, confirmationPrice = null) {
    try {
      const position = await PositionRepository.findById(positionId);

      if (!position) {
        logger.warn('Position not found', { positionId });
        return null;
      }

      if (position.status !== 'pending') {
        logger.warn('Position cannot be opened from non-pending state', {
          positionId,
          currentStatus: position.status,
        });
        return null;
      }

      // 更新为 open 状态
      const updated = await PositionRepository.updateStatus(positionId, 'open', {
        opened_at: new Date(),
        confirmation_price: confirmationPrice || position.entry,
      });

      logger.info('Position opened', {
        positionId,
        symbol: position.symbol,
        entry: position.entry,
      });

      // 记录事件
      await EventRepository.create({
        event_type: 'position_opened',
        entity_type: 'position',
        entity_id: positionId,
        data: {
          symbol: position.symbol,
          entry: position.entry,
        },
      });

      return updated;
    } catch (error) {
      logger.error('Failed to open position', {
        positionId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 平仓（从 open 状态转移到 closed）
   */
  async closePosition(positionId, exitPrice) {
    try {
      const position = await PositionRepository.findById(positionId);

      if (!position) {
        logger.warn('Position not found', { positionId });
        return null;
      }

      if (position.status !== 'open') {
        logger.warn('Position cannot be closed from non-open state', {
          positionId,
          currentStatus: position.status,
        });
        return null;
      }

      // 计算 PnL
      const pnl = this.calculatePnL(position.entry, exitPrice, position.size);
      const pnlPercent = ((pnl / (position.entry * position.size)) * 100).toFixed(2);

      // 更新为 closed 状态
      const updated = await PositionRepository.updateStatus(positionId, 'closed', {
        exit: exitPrice,
        closed_at: new Date(),
        pnl,
        pnl_percent: parseFloat(pnlPercent),
      });

      logger.info('Position closed', {
        positionId,
        symbol: position.symbol,
        entry: position.entry,
        exit: exitPrice,
        pnl,
        pnlPercent: `${pnlPercent}%`,
      });

      // 记录事件
      await EventRepository.create({
        event_type: 'position_closed',
        entity_type: 'position',
        entity_id: positionId,
        data: {
          symbol: position.symbol,
          entry: position.entry,
          exit: exitPrice,
          pnl,
          pnlPercent,
        },
      });

      this.activePositions.delete(positionId);

      return updated;
    } catch (error) {
      logger.error('Failed to close position', {
        positionId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 计算 PnL
   */
  calculatePnL(entry, exit, size) {
    if (!entry || !exit || !size || entry <= 0 || size <= 0) {
      return 0;
    }
    return (exit - entry) * size;
  }

  /**
   * 更新目标价格
   */
  async updateTP(positionId, newTP) {
    try {
      await PositionRepository.updateTP(positionId, newTP);

      logger.info('TP updated', {
        positionId,
        tp: newTP,
      });

      return true;
    } catch (error) {
      logger.error('Failed to update TP', {
        positionId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * 更新止损
   */
  async updateSL(positionId, newSL) {
    try {
      await PositionRepository.updateSL(positionId, newSL);

      logger.info('SL updated', {
        positionId,
        sl: newSL,
      });

      return true;
    } catch (error) {
      logger.error('Failed to update SL', {
        positionId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * 获取活跃仓位
   */
  async getActivePositions(trader = null) {
    try {
      const positions = await PositionRepository.findByStatus('open', { trader });
      return positions;
    } catch (error) {
      logger.error('Failed to get active positions', { error: error.message });
      throw error;
    }
  }

  /**
   * 获取仓位统计
   */
  async getPositionStats(trader) {
    try {
      const allPositions = await PositionRepository.findByTrader(trader);

      const closed = allPositions.filter(p => p.status === 'closed');
      const wins = closed.filter(p => p.pnl > 0);
      const losses = closed.filter(p => p.pnl < 0);

      const totalPnL = closed.reduce((sum, p) => sum + (p.pnl || 0), 0);
      const avgPnL = closed.length > 0 ? totalPnL / closed.length : 0;

      return {
        totalPositions: allPositions.length,
        openPositions: allPositions.filter(p => p.status === 'open').length,
        closedPositions: closed.length,
        wins: wins.length,
        losses: losses.length,
        winRate: closed.length > 0 
          ? ((wins.length / closed.length) * 100).toFixed(2) + '%'
          : '0%',
        totalPnL: totalPnL.toFixed(2),
        avgPnL: avgPnL.toFixed(2),
      };
    } catch (error) {
      logger.error('Failed to get position stats', { error: error.message });
      throw error;
    }
  }
}

module.exports = new PositionManager();
