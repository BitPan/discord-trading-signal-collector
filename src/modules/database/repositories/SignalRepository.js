/**
 * Signal Repository
 * 信号表操作
 */

const logger = require('../../../utils/logger');
const connection = require('../connection');

class SignalRepository {
  /**
   * 保存信号
   */
  static async create(data) {
    const {
      id,
      message_ids,
      type,
      trader,
      symbol,
      action,
      entry,
      size,
      tp,
      sl,
      direction,
      raw_data,
      confidence,
    } = data;

    try {
      const result = await connection.query(
        `INSERT INTO signals (
          id, message_ids, type, trader, symbol, action,
          entry, size, tp, sl, direction, raw_data,
          confidence, created_at, parsed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        RETURNING *`,
        [
          id,
          JSON.stringify(Array.isArray(message_ids) ? message_ids : [message_ids]),
          type,
          trader,
          symbol,
          action,
          entry || null,
          size || null,
          tp ? JSON.stringify(tp) : JSON.stringify([]),
          sl ? JSON.stringify(sl) : JSON.stringify([]),
          direction || null,
          JSON.stringify(raw_data || {}),
          confidence || 1.0,
        ],
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create signal', { error: error.message });
      throw error;
    }
  }

  /**
   * 查询信号（按交易员）
   */
  static async findByTrader(trader, options = {}) {
    const { limit = 100, offset = 0, status = null } = options;

    let query = 'SELECT * FROM signals WHERE trader = $1';
    const params = [trader];

    if (status) {
      query += ` AND action = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    try {
      const result = await connection.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to find signals', { error: error.message });
      throw error;
    }
  }

  /**
   * 查询信号（按符号）
   */
  static async findBySymbol(symbol, options = {}) {
    const { limit = 100, offset = 0 } = options;

    try {
      const result = await connection.query(
        'SELECT * FROM signals WHERE symbol = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [symbol, limit, offset],
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to find signals by symbol', { error: error.message });
      throw error;
    }
  }

  /**
   * 计数
   */
  static async count(trader = null) {
    try {
      let query = 'SELECT COUNT(*) as count FROM signals';
      const params = [];

      if (trader) {
        query += ' WHERE trader = $1';
        params.push(trader);
      }

      const result = await connection.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Failed to count signals', { error: error.message });
      throw error;
    }
  }
}

module.exports = SignalRepository;
