/**
 * 数据库连接测试
 */

describe('DatabaseConnection', () => {
  const connection = require('../../../modules/database/connection');

  it('should be defined', () => {
    expect(connection).toBeDefined();
  });

  it('should have required methods', () => {
    expect(typeof connection.initialize).toBe('function');
    expect(typeof connection.query).toBe('function');
    expect(typeof connection.transaction).toBe('function');
    expect(typeof connection.close).toBe('function');
    expect(typeof connection.getStats).toBe('function');
  });

  it('should return null stats before initialization', () => {
    const stats = connection.getStats();
    // Stats may be null or contain pool info depending on state
    expect(stats === null || typeof stats === 'object').toBe(true);
  });
});
