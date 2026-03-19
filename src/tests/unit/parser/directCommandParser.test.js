/**
 * 直接命令解析器测试
 */

describe('DirectCommandParser', () => {
  const parser = require('../../../modules/parser/directCommandParser');

  describe('parse', () => {
    it('should parse OPEN command', () => {
      const signal = parser.parse('OPEN BTCUSD 45000 0.5');
      expect(signal).toBeDefined();
      expect(signal.action).toBe('open');
      expect(signal.symbol).toBe('BTCUSD');
      expect(signal.entry).toBe(45000);
      expect(signal.size).toBe(0.5);
    });

    it('should parse CLOSE command', () => {
      const signal = parser.parse('CLOSE BTCUSD');
      expect(signal).toBeDefined();
      expect(signal.action).toBe('close');
      expect(signal.symbol).toBe('BTCUSD');
    });

    it('should be case insensitive', () => {
      const signal1 = parser.parse('open btcusd 45000 0.5');
      const signal2 = parser.parse('OPEN BTCUSD 45000 0.5');
      expect(signal1.symbol).toBe(signal2.symbol);
    });

    it('should return null for invalid commands', () => {
      const signal = parser.parse('random text');
      expect(signal).toBeNull();
    });

    it('should parse TP values', () => {
      const signal = parser.parse('OPEN BTCUSD 45000 0.5 TP:50000,55000');
      expect(signal.tp.length).toBeGreaterThan(0);
    });

    it('should return null for null input', () => {
      expect(parser.parse(null)).toBeNull();
    });
  });

  describe('isCommand', () => {
    it('should detect commands', () => {
      expect(parser.isCommand('OPEN BTCUSD 45000 0.5')).toBe(true);
      expect(parser.isCommand('CLOSE BTCUSD')).toBe(true);
      expect(parser.isCommand('random text')).toBe(false);
    });
  });
});
