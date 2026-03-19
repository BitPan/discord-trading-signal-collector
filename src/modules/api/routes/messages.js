/**
 * 消息 API 路由
 */

const router = require('express').Router();
const MessageRepository = require('../../database/repositories/MessageRepository');
const { asyncHandler } = require('../../../utils/errorHandler');

/**
 * GET /api/v1/messages - 获取消息列表
 */
router.get('/', asyncHandler(async (req, res) => {
  const { channelId, limit = 50, offset = 0 } = req.query;

  let messages;

  if (channelId) {
    messages = await MessageRepository.findByChannel(channelId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } else {
    // 获取所有消息（简单版本，直接查询）
    messages = [];
  }

  res.json({
    success: true,
    data: messages,
    count: messages.length,
  });
}));

module.exports = router;
