/**
 * 交易员 API 路由
 */

const router = require('express').Router();
const TraderRepository = require('../../database/repositories/TraderRepository');
const { asyncHandler } = require('../../../utils/errorHandler');

/**
 * GET /api/v1/traders - 获取交易员列表
 */
router.get('/', asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  const traders = await TraderRepository.findAll({
    limit: parseInt(limit),
    offset: parseInt(offset),
  });

  res.json({
    success: true,
    data: traders,
    count: traders.length,
  });
}));

/**
 * GET /api/v1/traders/:id - 获取交易员统计
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const stats = await TraderRepository.getStats(req.params.id);

  if (!stats) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'TRADER_NOT_FOUND',
        message: 'Trader not found',
      },
    });
  }

  res.json({
    success: true,
    data: stats,
  });
}));

module.exports = router;
