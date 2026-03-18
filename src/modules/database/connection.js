/**
 * 数据库连接管理
 * PostgreSQL 连接池管理
 */

const { Pool } = require('pg');
const logger = require('../../utils/logger');
const config = require('../../config');

class DatabaseConnection {
  constructor() {
    this.pool = null;
    this.initialized = false;
  }

  /**
   * 初始化数据库连接池
   */
  async initialize() {
    if (this.initialized) {
      logger.warn('Database connection already initialized');
      return;
    }

    try {
      this.pool = new Pool({
        connectionString: config.database.url,
        // 连接池配置
        max: 20,                  // 最大连接数
        min: 2,                   // 最小连接数
        idleTimeoutMillis: 30000, // 闲置超时
        connectionTimeoutMillis: 2000,
        // SSL（可选）
        ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
      });

      // 测试连接
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();

      logger.info('Database connected successfully', {
        time: result.rows[0].now,
      });

      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize database connection', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 执行查询
   */
  async query(text, params) {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.pool.query(text, params);
      return result;
    } catch (error) {
      logger.error('Database query failed', {
        error: error.message,
        query: text.substring(0, 100),
      });
      throw error;
    }
  }

  /**
   * 事务执行
   */
  async transaction(callback) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction failed', {
        error: error.message,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 关闭连接池
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.initialized = false;
      logger.info('Database connection closed');
    }
  }

  /**
   * 获取连接池统计信息
   */
  getStats() {
    if (!this.pool) {
      return null;
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

// 导出单例
module.exports = new DatabaseConnection();
