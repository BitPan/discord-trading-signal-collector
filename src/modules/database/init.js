/**
 * 数据库初始化
 * 创建表、索引和触发器
 */

const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const connection = require('./connection');

class DatabaseInitializer {
  /**
   * 初始化数据库（创建所有表）
   */
  static async initialize() {
    try {
      logger.info('Initializing database schema...');

      // 读取 schema.sql
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');

      // 执行 schema
      await connection.query(schema);

      logger.info('Database schema initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database schema', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 清空所有表（用于测试）
   */
  static async truncateAll() {
    const tables = [
      'events',
      'positions',
      'signals',
      'messages',
      'traders',
    ];

    try {
      for (const table of tables) {
        await connection.query(`TRUNCATE TABLE ${table} CASCADE`);
      }
      logger.info('All tables truncated');
    } catch (error) {
      logger.error('Failed to truncate tables', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 检查表是否存在
   */
  static async tableExists(tableName) {
    try {
      const result = await connection.query(
        `SELECT EXISTS(
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = $1
        )`,
        [tableName],
      );
      return result.rows[0].exists;
    } catch (error) {
      logger.error('Failed to check table existence', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * 获取数据库状态
   */
  static async getStatus() {
    try {
      const tables = [
        'messages',
        'signals',
        'positions',
        'traders',
        'events',
      ];

      const status = {};
      for (const table of tables) {
        const result = await connection.query(
          `SELECT COUNT(*) as count FROM ${table}`,
        );
        status[table] = parseInt(result.rows[0].count);
      }

      return status;
    } catch (error) {
      logger.error('Failed to get database status', {
        error: error.message,
      });
      return null;
    }
  }
}

module.exports = DatabaseInitializer;
