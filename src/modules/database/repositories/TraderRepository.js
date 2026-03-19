/**
 * Trader Repository
 * 交易员信息管理
 */

const logger = require('../../../utils/logger');
const connection = require('../connection');

class TraderRepository {
  /**
   * 获取或创建交易员
   */
  static async findOrCreate(data) {
    const { id, discord_user_id, username } = data;

    try {
      // 先查找
      const existing = await connection.query(
        'SELECT * FROM traders WHERE id = $1',
        [id],
      );

      if (existing.rows.length > 0) {
        return existing.rows[0];
      }

      // 创建新的
      const result = await connection.query(
        `INSERT INTO traders (
          id, discord_user_id, username, created_at, updated_at
        ) VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING *`,
        [id, discord_user_id, username],
      );

      logger.info('Trader created', {
        traderId: id,
        username,
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to find or create trader', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 获取交易员统计
   */
  static async getStats(traderId) {
    try {
      const result = await connection.query(
        `SELECT 
          id, username, total_positions, win_count, loss_count,
          win_rate, total_pnl, avg_pnl
        FROM traders
        WHERE id = $1`,
        [traderId],
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get trader stats', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 列表查询
   */
  static async findAll(options = {}) {
    const { limit = 100, offset = 0, sortBy = 'win_rate' } = options;

    try {
      const result = await connection.query(
        `SELECT * FROM traders 
        ORDER BY ${sortBy} DESC 
        LIMIT $1 OFFSET $2`,
        [limit, offset],
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to list traders', { error: error.message });
      throw error;
    }
  }
}

module.exports = TraderRepository;
