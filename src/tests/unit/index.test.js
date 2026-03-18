describe('Discord Trading Signal Collector', () => {
  test('should export app, discordClient, and logger', () => {
    const { app, discordClient, logger } = require('../../index.js');
    expect(app).toBeDefined();
    expect(discordClient).toBeDefined();
    expect(logger).toBeDefined();
  });

  test('app should be an express app', () => {
    const { app } = require('../../index.js');
    expect(typeof app.listen).toBe('function');
  });
});
