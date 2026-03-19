/**
 * 健康监控测试
 */

describe('HealthMonitor', () => {
  const healthMonitor = require('../../../modules/monitor/healthMonitor');

  it('should be defined', () => {
    expect(healthMonitor).toBeDefined();
  });

  it('should have required methods', () => {
    expect(typeof healthMonitor.updateModuleStatus).toBe('function');
    expect(typeof healthMonitor.getHealth).toBe('function');
    expect(typeof healthMonitor.getModuleStatus).toBe('function');
    expect(typeof healthMonitor.isModuleHealthy).toBe('function');
    expect(typeof healthMonitor.generateReport).toBe('function');
  });

  it('should get health status', () => {
    const health = healthMonitor.getHealth();
    expect(health).toBeDefined();
    expect(typeof health.healthy).toBe('boolean');
    expect(typeof health.uptime).toBe('number');
    expect(Array.isArray(health.issues)).toBe(true);
  });

  it('should update module status', () => {
    healthMonitor.updateModuleStatus('discord', 'ok', null);
    const status = healthMonitor.getModuleStatus('discord');
    expect(status).toBeDefined();
    expect(status.status).toBe('ok');
  });

  it('should generate report', () => {
    const report = healthMonitor.generateReport();
    expect(report).toBeDefined();
    expect(report.summary).toBeDefined();
    expect(report.health).toBeDefined();
  });
});
