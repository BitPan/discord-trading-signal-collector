/**
 * Message Repository
 * 消息表操作
 */

const logger = require('../../../utils/logger');
const connection = require('../connection');

class MessageRepository {
  /**
   * 保存消息
   */
  static async create(data) {
    const {
      id,
      discord_user_id,
      discord_username,
      channel_id,
      content,
      attachments,
    } = data;

    try {
      const result = await connection.query(
        `INSERT INTO messages (
          id, discord_user_id, discord_username, channel_id, 
          content, attachments, created_at, fetched_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (id, channel_id) DO UPDATE SET
          content = EXCLUDED.content,
          attachments = EXCLUDED.attachments,
          fetched_at = NOW()
        RETURNING *`,
        [
          id,
          discord_user_id,
          discord_username,
          channel_id,
          content,
          JSON.stringify(attachments || []),
        ],
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create message', { error: error.message });
      throw error;
    }
  }

  /**
   * 查询消息（支持分页）
   */
  static async findByChannel(channelId, options = {}) {
    const { limit = 100, offset = 0, since = null } = options;

    let query = 'SELECT * FROM messages WHERE channel_id = $1';
    const params = [channelId];

    if (since) {
      query += ` AND created_at > $${params.length + 1}`;
      params.push(since);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    try {
      const result = await connection.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to find messages', { error: error.message });
      throw error;
    }
  }

  /**
   * 获取未解析的消息
   */
  static async findUnparsed(limit = 100) {
    try {
      const result = await connection.query(
        'SELECT * FROM messages WHERE parsed = false ORDER BY created_at DESC LIMIT $1',
        [limit],
      );
      return result.rows;
    } catch (error) {
      logger.error('Failed to find unparsed messages', { error: error.message });
      throw error;
    }
  }

  /**
   * 标记为已解析
   */
  static async markParsed(messageId) {
    try {
      await connection.query(
        'UPDATE messages SET parsed = true WHERE id = $1',
        [messageId],
      );
    } catch (error) {
      logger.error('Failed to mark message as parsed', { error: error.message });
      throw error;
    }
  }

  /**
   * 计数
   */
  static async count(channelId = null) {
    try {
      let query = 'SELECT COUNT(*) as count FROM messages';
      const params = [];

      if (channelId) {
        query += ' WHERE channel_id = $1';
        params.push(channelId);
      }

      const result = await connection.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Failed to count messages', { error: error.message });
      throw error;
    }
  }
}

module.exports = MessageRepository;
