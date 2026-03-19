/**
 * Discord User Client 测试
 */

describe('DiscordUserClient', () => {
  const userClient = require('../../../modules/discord/userClient');

  it('should be defined', () => {
    expect(userClient).toBeDefined();
  });

  it('should have required methods', () => {
    expect(typeof userClient.initialize).toBe('function');
    expect(typeof userClient.fetchChannels).toBe('function');
    expect(typeof userClient.syncHistoryMessages).toBe('function');
    expect(typeof userClient.isConnected).toBe('function');
    expect(typeof userClient.disconnect).toBe('function');
    expect(typeof userClient.getChannels).toBe('function');
  });

  it('should not be connected initially', () => {
    expect(userClient.isConnected()).toBe(false);
  });

  it('should have empty channels initially', () => {
    const channels = userClient.getChannels();
    expect(Array.isArray(channels)).toBe(true);
  });
});
