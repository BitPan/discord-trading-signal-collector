/**
 * 消息验证器测试
 */

describe('MessageValidator', () => {
  const validator = require('../../../modules/parser/messageValidator');

  describe('validate', () => {
    it('should validate valid message', () => {
      const result = validator.validate({
        id: 'msg123',
        content: 'OPEN BTCUSD 45000 0.5',
        channelId: 'ch123',
        userId: 'user123',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject missing content', () => {
      const result = validator.validate({
        channelId: 'ch123',
        userId: 'user123',
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('isTradeMessage', () => {
    it('should detect trade messages', () => {
      expect(validator.isTradeMessage('OPEN BTCUSD 45000 0.5')).toBe(true);
      expect(validator.isTradeMessage('CLOSE BTCUSD')).toBe(true);
      expect(validator.isTradeMessage('Hello world')).toBe(false);
    });
  });

  describe('normalize', () => {
    it('should normalize content', () => {
      const normalized = validator.normalize('  OPEN   BTCUSD   45000  ');
      expect(normalized).toBe('OPEN BTCUSD 45000');
    });
  });
});
