/**
 * Express 应用程序设置
 */

const express = require('express');
const requestLogger = require('../../utils/requestLogger');
const { errorHandler, notFoundHandler } = require('../../utils/errorHandler');

/**
 * 创建 Express 应用
 */
function createApp() {
  const app = express();

  // 中间件
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // 健康检查端点
  app.get('/api/v1/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // 404 处理
  app.use(notFoundHandler);

  // 错误处理（必须在最后）
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
