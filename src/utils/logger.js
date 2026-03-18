/**
 * 日志系统
 * 使用 Winston 进行日志管理
 */

const winston = require('winston');
const config = require('../config');

const logger = winston.createLogger({
  level: config.logger.level,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'discord-collector' },
  transports: [
    // 错误日志
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
    }),
    // 所有日志
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760,
    }),
  ],
});

// 生产环境添加控制台输出
if (config.nodeEnv !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
            return `${timestamp} [${level}]: ${message} ${metaStr}`;
          },
        ),
      ),
    }),
  );
}

module.exports = logger;
