/**
 * Event Repository 测试
 */

describe('EventRepository', () => {
  const EventRepository = require('../../../modules/database/repositories/EventRepository');

  it('should be defined', () => {
    expect(EventRepository).toBeDefined();
  });

  it('should have required methods', () => {
    expect(typeof EventRepository.create).toBe('function');
    expect(typeof EventRepository.findByType).toBe('function');
    expect(typeof EventRepository.findErrors).toBe('function');
    expect(typeof EventRepository.count).toBe('function');
  });
});
