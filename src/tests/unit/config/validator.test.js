/**
 * 配置验证器测试
 */

describe('ConfigValidator', () => {
  const ConfigValidator = require('../../../config/validator');

  describe('validate', () => {
    it('should pass valid config', () => {
      const validConfig = {
        discord: { botToken: 'test-token' },
        database: { url: 'postgresql://localhost/test' },
        api: { port: 3000 },
        telegram: { botToken: null },
      };

      expect(() => ConfigValidator.validate(validConfig)).not.toThrow();
    });

    it('should throw if DISCORD_BOT_TOKEN missing', () => {
      const invalidConfig = {
        discord: { botToken: null },
        database: { url: 'postgresql://localhost/test' },
      };

      expect(() => ConfigValidator.validate(invalidConfig)).toThrow();
    });

    it('should throw if DATABASE_URL missing', () => {
      const invalidConfig = {
        discord: { botToken: 'test-token' },
        database: { url: null },
      };

      expect(() => ConfigValidator.validate(invalidConfig)).toThrow();
    });

    it('should validate port range', () => {
      const invalidConfig = {
        discord: { botToken: 'test-token' },
        database: { url: 'postgresql://localhost/test' },
        api: { port: 99999 },
      };

      expect(() => ConfigValidator.validate(invalidConfig)).toThrow();
    });
  });
});
