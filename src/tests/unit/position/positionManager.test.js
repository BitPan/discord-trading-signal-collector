/**
 * 仓位管理器测试
 */

describe('PositionManager', () => {
  const positionManager = require('../../../modules/position/positionManager');

  it('should be defined', () => {
    expect(positionManager).toBeDefined();
  });

  it('should have required methods', () => {
    expect(typeof positionManager.createPositionFromSignal).toBe('function');
    expect(typeof positionManager.openPosition).toBe('function');
    expect(typeof positionManager.closePosition).toBe('function');
    expect(typeof positionManager.calculatePnL).toBe('function');
    expect(typeof positionManager.getActivePositions).toBe('function');
    expect(typeof positionManager.getPositionStats).toBe('function');
  });

  describe('calculatePnL', () => {
    it('should calculate long PnL correctly', () => {
      const pnl = positionManager.calculatePnL(100, 110, 1);
      expect(pnl).toBe(10);
    });

    it('should calculate loss correctly', () => {
      const pnl = positionManager.calculatePnL(100, 90, 1);
      expect(pnl).toBe(-10);
    });

    it('should handle multiple size', () => {
      const pnl = positionManager.calculatePnL(100, 110, 10);
      expect(pnl).toBe(100);
    });

    it('should return 0 for invalid inputs', () => {
      expect(positionManager.calculatePnL(0, 100, 1)).toBe(0);
      expect(positionManager.calculatePnL(100, 0, 1)).toBe(0);
      expect(positionManager.calculatePnL(100, 110, 0)).toBe(0);
    });
  });
});
