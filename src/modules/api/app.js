/**
 * Express 应用程序设置
 */

const express = require('express');
const path = require('path');
const requestLogger = require('../../utils/requestLogger');
const { errorHandler, notFoundHandler } = require('../../utils/errorHandler');
const positionsRouter = require('./routes/positions');
const signalsRouter = require('./routes/signals');
const messagesRouter = require('./routes/messages');
const tradersRouter = require('./routes/traders');
const insightsRouter = require('./routes/insights');
const syncRouter = require('./routes/sync');

/**
 * 创建 Express 应用
 */
function createApp() {
  const app = express();

  // 中间件
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // 静态文件服务（UI）
  const publicPath = path.join(__dirname, '../../..', 'public');
  app.use(express.static(publicPath));

  // 健康检查端点
  app.get('/api/v1/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // API 路由
  app.use('/api/v1/positions', positionsRouter);
  app.use('/api/v1/signals', signalsRouter);
  app.use('/api/v1/messages', messagesRouter);
  app.use('/api/v1/traders', tradersRouter);
  app.use('/api/v1/insights', insightsRouter);
  app.use('/api/v1/sync', syncRouter);

  // 首页路由
  app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });

  // 404 处理
  app.use(notFoundHandler);

  // 错误处理（必须在最后）
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
