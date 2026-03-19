/**
 * Monitor 模块入口
 */

const healthMonitor = require('./healthMonitor');
const alertService = require('../telegram/alertService');
const AlertRepository = require('../database/repositories/AlertRepository');
const logger = require('../../utils/logger');

class MonitorService {
  constructor() {
    this.checkInterval = null;
    this.isRunning = false;
  }

  /**
   * 启动监控
   */
  async start() {
    try {
      logger.info('Starting monitor service...');

      await alertService.initialize();

      // 定期检查系统健康状态（每5分钟）
      this.checkInterval = setInterval(() => {
        this.performHealthCheck();
      }, 5 * 60 * 1000);

      // 初始检查
      await this.performHealthCheck();

      this.isRunning = true;
      logger.info('Monitor service started');
    } catch (error) {
      logger.error('Failed to start monitor service', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck() {
    try {
      const health = healthMonitor.getHealth();

      logger.info('Health check performed', {
        healthy: health.healthy,
        issues: health.issues.length,
      });

      // 如果有问题，发送告警
      if (!health.healthy) {
        await alertService.alertHealthCheck(health);
      }

      // 记录到数据库
      try {
        await AlertRepository.create({
          alert_type: 'health_check',
          title: health.healthy ? 'System Healthy' : 'System Issues Detected',
          message: health.issues.join(', ') || 'All systems operational',
          details: health,
          severity: health.healthy ? 'info' : 'error',
        });
      } catch (dbError) {
        logger.error('Failed to record health check', { error: dbError.message });
      }
    } catch (error) {
      logger.error('Health check failed', { error: error.message });
    }
  }

  /**
   * 获取健康状态
   */
  getHealth() {
    return healthMonitor.getHealth();
  }

  /**
   * 更新模块状态
   */
  updateModuleStatus(moduleName, status, error = null) {
    healthMonitor.updateModuleStatus(moduleName, status, error);
  }

  /**
   * 发送告警
   */
  async sendAlert(type, title, message, details = {}) {
    return alertService.sendAlert(type, title, message, details);
  }

  /**
   * 停止监控
   */
  async stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    this.isRunning = false;
    logger.info('Monitor service stopped');
  }
}

module.exports = new MonitorService();
