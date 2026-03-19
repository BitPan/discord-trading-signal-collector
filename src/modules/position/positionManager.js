/**
 * 仓位管理器
 * 处理仓位的完整生命周期
 */

const logger = require('../../utils/logger');
const PositionRepository = require('../database/repositories/PositionRepository');
const telegramService = require('../telegram/telegramService');

class PositionManager {
  /**
   * 从信号创建仓位
   */
  async createPositionFromSignal(signal) {
    try {
      const position = {
        id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        trader: signal.trader,
        symbol: signal.symbol,
        status: 'pending',
        entry: signal.entry,
        size: signal.size,
        signal_ids: [signal.id]
      };

      await PositionRepository.create(position);
      
      logger.info('Position created from signal', {
        positionId: position.id,
        trader: signal.trader,
        symbol: signal.symbol
      });

      // 发送 Telegram 通知
      await telegramService.notifyPositionOpened(position, signal);

      return position;
    } catch (error) {
      logger.error('Failed to create position from signal', {
        error: error.message,
        signalId: signal.id
      });
      throw error;
    }
  }

  /**
   * 开仓（pending → open）
   */
  async openPosition(positionId, confirmPrice) {
    try {
      const position = await PositionRepository.findById(positionId);
      if (!position) {
        throw new Error(`Position not found: ${positionId}`);
      }

      if (position.status !== 'pending') {
        throw new Error(`Position status is ${position.status}, cannot open`);
      }

      position.status = 'open';
      position.opened_at = new Date();
      position.entry = confirmPrice || position.entry;

      await PositionRepository.update(position);

      logger.info('Position opened', {
        positionId: positionId,
        entry: position.entry
      });

      // 发送 Telegram 通知
      await telegramService.notifyAlert(
        '仓位已开仓',
        `${position.trader} 的 ${position.symbol} 仓位已以 ${position.entry} 开仓`,
        'info'
      );

      return position;
    } catch (error) {
      logger.error('Failed to open position', {
        error: error.message,
        positionId: positionId
      });
      throw error;
    }
  }

  /**
   * 关仓（open → closed）
   */
  async closePosition(positionId, exitPrice) {
    try {
      const position = await PositionRepository.findById(positionId);
      if (!position) {
        throw new Error(`Position not found: ${positionId}`);
      }

      if (position.status !== 'open') {
        throw new Error(`Position status is ${position.status}, cannot close`);
      }

      position.status = 'closed';
      position.exit = exitPrice;
      position.closed_at = new Date();

      // 计算 PnL
      if (position.entry && position.exit && position.size) {
        position.pnl = (position.exit - position.entry) * position.size;
        position.pnl_percent = ((position.exit - position.entry) / position.entry) * 100;
      }

      await PositionRepository.update(position);

      logger.info('Position closed', {
        positionId: positionId,
        exit: position.exit,
        pnl: position.pnl,
        pnlPercent: position.pnl_percent
      });

      // 发送 Telegram 通知
      await telegramService.notifyPositionClosed(position);

      return position;
    } catch (error) {
      logger.error('Failed to close position', {
        error: error.message,
        positionId: positionId
      });
      throw error;
    }
  }

  /**
   * 更新 TP（Take Profit）
   */
  async updateTargetProfit(positionId, tp) {
    try {
      const position = await PositionRepository.findById(positionId);
      if (!position) {
        throw new Error(`Position not found: ${positionId}`);
      }

      if (typeof tp === 'number') {
        position.tp = JSON.stringify([tp]);
      } else if (Array.isArray(tp)) {
        position.tp = JSON.stringify(tp);
      }

      await PositionRepository.update(position);

      logger.info('Position TP updated', {
        positionId: positionId,
        tp: position.tp
      });

      // 发送 Telegram 通知
      const tpArray = JSON.parse(position.tp || '[]');
      if (tpArray.length > 0) {
        await telegramService.notifyTargetProfit(position, tpArray[0]);
      }

      return position;
    } catch (error) {
      logger.error('Failed to update target profit', {
        error: error.message,
        positionId: positionId
      });
      throw error;
    }
  }

  /**
   * 更新 SL（Stop Loss）
   */
  async updateStopLoss(positionId, sl) {
    try {
      const position = await PositionRepository.findById(positionId);
      if (!position) {
        throw new Error(`Position not found: ${positionId}`);
      }

      if (typeof sl === 'number') {
        position.sl = JSON.stringify([sl]);
      } else if (Array.isArray(sl)) {
        position.sl = JSON.stringify(sl);
      }

      await PositionRepository.update(position);

      logger.info('Position SL updated', {
        positionId: positionId,
        sl: position.sl
      });

      // 发送 Telegram 通知
      const slArray = JSON.parse(position.sl || '[]');
      if (slArray.length > 0) {
        await telegramService.notifyStopLoss(position, slArray[0]);
      }

      return position;
    } catch (error) {
      logger.error('Failed to update stop loss', {
        error: error.message,
        positionId: positionId
      });
      throw error;
    }
  }
}

module.exports = new PositionManager();
