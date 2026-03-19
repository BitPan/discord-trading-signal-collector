/**
 * Telegram 告警服务测试
 */

describe('TelegramAlertService', () => {
  const alertService = require('../../../modules/telegram/alertService');

  it('should be defined', () => {
    expect(alertService).toBeDefined();
  });

  it('should have required methods', () => {
    expect(typeof alertService.initialize).toBe('function');
    expect(typeof alertService.sendAlert).toBe('function');
    expect(typeof alertService.alertDiscordConnection).toBe('function');
    expect(typeof alertService.alertMessageSync).toBe('function');
    expect(typeof alertService.alertSignalGenerated).toBe('function');
    expect(typeof alertService.alertDatabaseError).toBe('function');
    expect(typeof alertService.alertSystemError).toBe('function');
    expect(typeof alertService.alertHealthCheck).toBe('function');
  });

  it('should format alert messages', () => {
    const alert = {
      type: 'error',
      title: 'Test Alert',
      message: 'Test message',
      details: { test: 'value' },
      timestamp: new Date().toISOString(),
    };

    const formatted = alertService.formatAlertMessage(alert);
    expect(formatted).toContain('Test Alert');
    expect(formatted).toContain('Test message');
  });

  it('should get service status', () => {
    const status = alertService.getStatus();
    expect(status).toBeDefined();
    expect(typeof status.enabled).toBe('boolean');
    expect(typeof status.queueLength).toBe('number');
  });
});
