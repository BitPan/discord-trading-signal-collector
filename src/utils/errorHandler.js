/**
 * 错误处理中间件
 */

const logger = require('./logger');

/**
 * Express 错误处理中间件
 */
const errorHandler = (err, req, res, _next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
  });

  // 返回错误响应
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Internal Server Error',
      timestamp: new Date().toISOString(),
      requestId: req.id,
    },
  });
};

/**
 * 异步路由处理包装器
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 处理
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
    },
  });
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
};
