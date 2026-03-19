/**
 * Position Repository
 * 仓位表操作
 */

const logger = require('../../../utils/logger');
const connection = require('../connection');

class PositionRepository {
  /**
   * 创建仓位
   */
  static async create(data) {
    const {
      id,
      trader,
      symbol,
      status,
      entry,
      size,
      tp,
      sl,
      signal_ids,
    } = data;

    try {
      const result = await connection.query(
        `INSERT INTO positions (
          id, trader, symbol, status, entry, size, tp, sl,
          signal_ids, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *`,
        [
          id,
          trader,
          symbol,
          status,
          entry || null,
          size || null,
          JSON.stringify(tp || []),
          JSON.stringify(sl || []),
          JSON.stringify(signal_ids || []),
        ],
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create position', { error: error.message });
      throw error;
    }
  }

  /**
   * 按 ID 查询
   */
  static async findById(id) {
    try {
      const result = await connection.query(
        'SELECT * FROM positions WHERE id = $1',
        [id],
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to find position', { error: error.message });
      throw error;
    }
  }

  /**
   * 按交易员查询
   */
  static async findByTrader(trader, options = {}) {
    const { limit = 100, offset = 0 } = options;

    try {
      const result = await connection.query(
        'SELECT * FROM positions WHERE trader = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [trader, limit, offset],
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to find positions', { error: error.message });
      throw error;
    }
  }

  /**
   * 按状态查询
   */
  static async findByStatus(status, options = {}) {
    const { trader = null, limit = 100, offset = 0 } = options;

    let query = 'SELECT * FROM positions WHERE status = $1';
    const params = [status];

    if (trader) {
      query += ` AND trader = $${params.length + 1}`;
      params.push(trader);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    try {
      const result = await connection.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to find positions by status', { error: error.message });
      throw error;
    }
  }

  /**
   * 更新状态
   */
  static async updateStatus(id, status, metadata = {}) {
    try {
      let query = 'UPDATE positions SET status = $1';
      const params = [status];

      if (metadata.opened_at) {
        query += `, opened_at = $${params.length + 1}`;
        params.push(metadata.opened_at);
      }

      if (metadata.exit) {
        query += `, exit = $${params.length + 1}`;
        params.push(metadata.exit);
      }

      if (metadata.closed_at) {
        query += `, closed_at = $${params.length + 1}`;
        params.push(metadata.closed_at);
      }

      if (metadata.pnl !== undefined) {
        query += `, pnl = $${params.length + 1}`;
        params.push(metadata.pnl);
      }

      if (metadata.pnl_percent !== undefined) {
        query += `, pnl_percent = $${params.length + 1}`;
        params.push(metadata.pnl_percent);
      }

      query += ' WHERE id = $' + (params.length + 1) + ' RETURNING *';
      params.push(id);

      const result = await connection.query(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update position status', { error: error.message });
      throw error;
    }
  }

  /**
   * 更新 TP
   */
  static async updateTP(id, tp) {
    try {
      const result = await connection.query(
        'UPDATE positions SET tp = $1 WHERE id = $2 RETURNING *',
        [JSON.stringify(tp), id],
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update TP', { error: error.message });
      throw error;
    }
  }

  /**
   * 更新 SL
   */
  static async updateSL(id, sl) {
    try {
      const result = await connection.query(
        'UPDATE positions SET sl = $1 WHERE id = $2 RETURNING *',
        [JSON.stringify(sl), id],
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update SL', { error: error.message });
      throw error;
    }
  }
}

module.exports = PositionRepository;
