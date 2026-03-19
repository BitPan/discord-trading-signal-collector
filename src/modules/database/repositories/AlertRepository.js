/**
 * Alert Repository
 * 告警历史记录
 */

const logger = require('../../../utils/logger');
const connection = require('../connection');

class AlertRepository {
  /**
   * 记录告警
   */
  static async create(data) {
    const { alert_type, title, message, details, severity } = data;

    try {
      // 使用 events 表来记录告警
      // （可以后续优化为单独的 alerts 表）
      const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const result = await connection.query(
        `INSERT INTO events (
          id, event_type, entity_type, data, timestamp
        ) VALUES ($1, $2, $3, $4, NOW())
        RETURNING *`,
        [
          id,
          'alert',
          alert_type,
          JSON.stringify({
            title,
            message,
            details,
            severity,
          }),
        ],
      );

      logger.info('Alert recorded', {
        type: alert_type,
        severity,
        title,
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to record alert', { error: error.message });
      throw error;
    }
  }

  /**
   * 查询告警历史
   */
  static async findByType(alertType, options = {}) {
    const { limit = 100, offset = 0 } = options;

    try {
      const result = await connection.query(
        `SELECT * FROM events 
        WHERE event_type = 'alert' AND entity_type = $1
        ORDER BY timestamp DESC 
        LIMIT $2 OFFSET $3`,
        [alertType, limit, offset],
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to find alerts', { error: error.message });
      throw error;
    }
  }

  /**
   * 查询错误告警
   */
  static async findErrors(options = {}) {
    const { limit = 100, offset = 0 } = options;

    try {
      const result = await connection.query(
        `SELECT * FROM events 
        WHERE event_type = 'alert' AND data->>'severity' = 'error'
        ORDER BY timestamp DESC 
        LIMIT $1 OFFSET $2`,
        [limit, offset],
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to find error alerts', { error: error.message });
      throw error;
    }
  }

  /**
   * 统计告警
   */
  static async count(alertType = null) {
    try {
      let query = 'SELECT COUNT(*) as count FROM events WHERE event_type = \'alert\'';
      const params = [];

      if (alertType) {
        query += ` AND entity_type = $${params.length + 1}`;
        params.push(alertType);
      }

      const result = await connection.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Failed to count alerts', { error: error.message });
      throw error;
    }
  }
}

module.exports = AlertRepository;
