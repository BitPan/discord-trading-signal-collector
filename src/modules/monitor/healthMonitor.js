/**
 * 健康监控服务
 * 监控系统各模块的状态
 */

const logger = require('../../utils/logger');

class HealthMonitor {
  constructor() {
    this.modules = {
      discord: { status: 'unknown', lastCheck: null, error: null },
      database: { status: 'unknown', lastCheck: null, error: null },
      parser: { status: 'unknown', lastCheck: null, error: null },
      telegram: { status: 'unknown', lastCheck: null, error: null },
    };
    this.startTime = Date.now();
  }

  /**
   * 更新模块状态
   */
  updateModuleStatus(moduleName, status, error = null) {
    if (this.modules[moduleName]) {
      this.modules[moduleName] = {
        status,
        lastCheck: new Date(),
        error: error ? error.message : null,
      };

      logger.debug('Module status updated', {
        module: moduleName,
        status,
      });
    }
  }

  /**
   * 获取整体健康状态
   */
  getHealth() {
    const issues = [];
    const statuses = [];

    for (const [name, info] of Object.entries(this.modules)) {
      statuses.push(`${name}:${info.status}`);

      if (info.status === 'error') {
        issues.push(`${name} (${info.error})`);
      }
    }

    const healthy = issues.length === 0;

    return {
      healthy,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      modules: this.modules,
      issues,
      statuses,
    };
  }

  /**
   * 获取模块状态
   */
  getModuleStatus(moduleName) {
    return this.modules[moduleName] || null;
  }

  /**
   * 检查模块可用性
   */
  isModuleHealthy(moduleName) {
    const module = this.modules[moduleName];
    return module && module.status === 'ok';
  }

  /**
   * 生成健康检查报告
   */
  generateReport() {
    const health = this.getHealth();
    const report = {
      summary: health.healthy 
        ? 'All systems operational' 
        : `${health.issues.length} issues detected`,
      health,
      timestamp: new Date().toISOString(),
    };

    return report;
  }
}

module.exports = new HealthMonitor();
