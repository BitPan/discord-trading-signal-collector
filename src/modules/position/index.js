/**
 * Position 模块入口
 */

const positionManager = require('./positionManager');

class PositionService {
  /**
   * 从信号创建仓位
   */
  static async createFromSignal(signal) {
    return positionManager.createPositionFromSignal(signal);
  }

  /**
   * 打开仓位
   */
  static async open(positionId, confirmPrice = null) {
    return positionManager.openPosition(positionId, confirmPrice);
  }

  /**
   * 平仓
   */
  static async close(positionId, exitPrice) {
    return positionManager.closePosition(positionId, exitPrice);
  }

  /**
   * 获取活跃仓位
   */
  static async getActive(trader = null) {
    return positionManager.getActivePositions(trader);
  }

  /**
   * 获取统计
   */
  static async getStats(trader) {
    return positionManager.getPositionStats(trader);
  }

  /**
   * 更新 TP
   */
  static async updateTP(positionId, tp) {
    return positionManager.updateTP(positionId, tp);
  }

  /**
   * 更新 SL
   */
  static async updateSL(positionId, sl) {
    return positionManager.updateSL(positionId, sl);
  }
}

module.exports = PositionService;
