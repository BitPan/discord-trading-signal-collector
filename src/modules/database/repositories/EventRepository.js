/**
 * Event Repository
 * 事件审计日志
 */

const logger = require('../../../utils/logger');
const connection = require('../connection');

class EventRepository {
  /**
   * 创建事件
   */
  static async create(data) {
    const { event_type, entity_type, entity_id, data: eventData, error } = data;

    try {
      // 生成随机 ID
      const id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const result = await connection.query(
        `INSERT INTO events (
          id, event_type, entity_type, entity_id, data, error, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *`,
        [
          id,
          event_type,
          entity_type,
          entity_id,
          JSON.stringify(eventData || {}),
          error ? JSON.stringify(error) : null,
        ],
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create event', { error: error.message });
      throw error;
    }
  }

  /**
   * 查询事件
   */
  static async findByType(eventType, options = {}) {
    const { limit = 100, offset = 0 } = options;

    try {
      const result = await connection.query(
        'SELECT * FROM events WHERE event_type = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3',
        [eventType, limit, offset],
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to find events', { error: error.message });
      throw error;
    }
  }

  /**
   * 获取错误事件
   */
  static async findErrors(options = {}) {
    const { limit = 100, offset = 0 } = options;

    try {
      const result = await connection.query(
        'SELECT * FROM events WHERE error IS NOT NULL ORDER BY timestamp DESC LIMIT $1 OFFSET $2',
        [limit, offset],
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to find error events', { error: error.message });
      throw error;
    }
  }

  /**
   * 统计事件
   */
  static async count(eventType = null) {
    try {
      let query = 'SELECT COUNT(*) as count FROM events';
      const params = [];

      if (eventType) {
        query += ' WHERE event_type = $1';
        params.push(eventType);
      }

      const result = await connection.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Failed to count events', { error: error.message });
      throw error;
    }
  }
}

module.exports = EventRepository;
