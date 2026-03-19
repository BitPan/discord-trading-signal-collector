/**
 * 信号 API 路由
 */

const router = require('express').Router();
const SignalRepository = require('../../database/repositories/SignalRepository');
const { asyncHandler } = require('../../../utils/errorHandler');

/**
 * GET /api/v1/signals - 获取信号列表
 */
router.get('/', asyncHandler(async (req, res) => {
  const { trader, symbol, limit = 50, offset = 0 } = req.query;

  let signals;

  if (trader) {
    signals = await SignalRepository.findByTrader(trader, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } else if (symbol) {
    signals = await SignalRepository.findBySymbol(symbol, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } else {
    // 默认获取所有信号
    signals = await SignalRepository.findByTrader('', {
      limit: parseInt(limit),
      offset: parseInt(offset),
    }).catch(() => []);
  }

  res.json({
    success: true,
    data: signals || [],
    count: signals ? signals.length : 0,
  });
}));

/**
 * GET /api/v1/signals/trader/:trader - 获取交易员的所有信号
 */
router.get('/trader/:trader', asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  const signals = await SignalRepository.findByTrader(req.params.trader, {
    limit: parseInt(limit),
    offset: parseInt(offset),
  });

  res.json({
    success: true,
    data: signals,
    count: signals.length,
  });
}));

module.exports = router;
