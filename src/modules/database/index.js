/**
 * 数据库模块主入口
 */

const connection = require('./connection');
const DatabaseInitializer = require('./init');
const MessageRepository = require('./repositories/MessageRepository');

class DatabaseService {
  /**
   * 初始化数据库
   */
  static async initialize() {
    await connection.initialize();
    // await DatabaseInitializer.initialize();  // 如果需要自动创建表，启用此行
  }

  /**
   * 关闭数据库
   */
  static async close() {
    await connection.close();
  }

  /**
   * 获取数据库状态
   */
  static async getStatus() {
    return DatabaseInitializer.getStatus();
  }

  /**
   * 获取连接对象
   */
  static getConnection() {
    return connection;
  }

  /**
   * 获取 Repository 对象
   */
  static getRepositories() {
    return {
      messages: MessageRepository,
      // 后续会添加更多 repository
    };
  }
}

module.exports = DatabaseService;
