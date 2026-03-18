/**
 * 请求日志中间件
 */

const logger = require('./logger');

/**
 * Express 请求日志中间件
 */
const requestLogger = (req, res, next) => {
  // 记录请求开始时间
  const startTime = Date.now();
  const requestId = req.id || `req-${Date.now()}-${Math.random()}`;

  // 记录请求
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // 拦截 res.send 以记录响应
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;

    logger.info('Outgoing response', {
      requestId,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      size: data ? data.length : 0,
    });

    return originalSend.call(this, data);
  };

  next();
};

module.exports = requestLogger;
