/**
 * 仓位 API 路由
 */

const router = require('express').Router();
const PositionRepository = require('../../database/repositories/PositionRepository');
const PositionService = require('../../position');
const { asyncHandler } = require('../../../utils/errorHandler');

/**
 * GET /api/v1/positions - 获取仓位列表
 */
router.get('/', asyncHandler(async (req, res) => {
  const { trader, status, limit = 50, offset = 0 } = req.query;

  let positions;

  if (status) {
    positions = await PositionRepository.findByStatus(status, {
      trader,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } else if (trader) {
    positions = await PositionRepository.findByTrader(trader, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } else {
    // 获取所有仓位
    positions = await PositionRepository.findByStatus('open', {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  }

  res.json({
    success: true,
    data: positions,
    count: positions.length,
  });
}));

/**
 * GET /api/v1/positions/:id - 获取单个仓位
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const position = await PositionRepository.findById(req.params.id);

  if (!position) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'POSITION_NOT_FOUND',
        message: 'Position not found',
      },
    });
  }

  res.json({
    success: true,
    data: position,
  });
}));

/**
 * POST /api/v1/positions/:id/open - 打开仓位
 */
router.post('/:id/open', asyncHandler(async (req, res) => {
  const { confirmPrice } = req.body;

  const position = await PositionService.open(req.params.id, confirmPrice);

  if (!position) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_POSITION_STATE',
        message: 'Cannot open position from current state',
      },
    });
  }

  res.json({
    success: true,
    data: position,
  });
}));

/**
 * POST /api/v1/positions/:id/close - 平仓
 */
router.post('/:id/close', asyncHandler(async (req, res) => {
  const { exitPrice } = req.body;

  if (!exitPrice) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_FIELD',
        message: 'exitPrice is required',
      },
    });
  }

  const position = await PositionService.close(req.params.id, exitPrice);

  if (!position) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_POSITION_STATE',
        message: 'Cannot close position from current state',
      },
    });
  }

  res.json({
    success: true,
    data: position,
  });
}));

/**
 * GET /api/v1/positions/trader/:trader/stats - 获取交易员统计
 */
router.get('/trader/:trader/stats', asyncHandler(async (req, res) => {
  const stats = await PositionService.getStats(req.params.trader);

  res.json({
    success: true,
    data: stats,
  });
}));

module.exports = router;

/**
 * PUT /api/v1/positions/:id/activate - 激活仓位（pending → active）
 */
router.put('/:id/activate', asyncHandler(async (req, res) => {
  const positionId = req.params.id;
  const logger = require('../../../utils/logger');
  const connection = require('../../database/connection');

  // 获取当前仓位
  const getResult = await connection.query(
    'SELECT * FROM positions WHERE id = $1',
    [positionId]
  );

  if (getResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Position not found'
    });
  }

  const position = getResult.rows[0];

  if (position.order_type === 'active') {
    return res.status(400).json({
      success: false,
      error: 'Position is already active'
    });
  }

  // 更新仓位为 active
  const updateResult = await connection.query(
    `UPDATE positions 
     SET order_type = 'active', status = 'open', updated_at = NOW() 
     WHERE id = $1 
     RETURNING *`,
    [positionId]
  );

  const updatedPosition = updateResult.rows[0];

  logger.info('Position activated', { 
    positionId, 
    orderType: updatedPosition.order_type,
    status: updatedPosition.status 
  });

  res.json({
    success: true,
    data: updatedPosition
  });
}));
