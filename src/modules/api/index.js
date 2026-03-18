/**
 * API 模块入口
 */

const createApp = require('./app');
const logger = require('../../utils/logger');
const config = require('../../config');

class APIService {
  constructor() {
    this.app = null;
    this.server = null;
  }

  /**
   * 启动 API 服务
   */
  async start() {
    try {
      // 创建 Express 应用
      this.app = createApp();

      // 启动 HTTP 服务器
      this.server = this.app.listen(config.api.port, () => {
        logger.info('API server started', {
          port: config.api.port,
          environment: config.nodeEnv,
        });
      });

      return this.server;
    } catch (error) {
      logger.error('Failed to start API server', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 停止 API 服务
   */
  async stop() {
    if (this.server) {
      return new Promise((resolve, reject) => {
        this.server.close((err) => {
          if (err) {
            logger.error('Error stopping API server', { error: err.message });
            reject(err);
          } else {
            logger.info('API server stopped');
            resolve();
          }
        });
      });
    }
  }

  /**
   * 获取应用对象
   */
  getApp() {
    return this.app;
  }
}

module.exports = new APIService();
