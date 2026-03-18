/**
 * 日志系统测试
 */

describe('Logger', () => {
  it('should be defined', () => {
    const logger = require('../../../utils/logger');
    expect(logger).toBeDefined();
  });

  it('should have log methods', () => {
    const logger = require('../../../utils/logger');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });
});
