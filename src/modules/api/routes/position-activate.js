/**
 * 仓位激活 API 路由
 * PUT /api/v1/position/:id/activate
 */

const express = require('express');
const router = express.Router();
const logger = require('../../../utils/logger');
const connection = require('../../database/connection');

/**
 * 激活仓位（将 pending 订单转为 active 订单）
 */
router.put('/:id/activate', async (req, res) => {
  const positionId = req.params.id;

  try {
    logger.info('激活仓位', { positionId });

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

    logger.info('仓位已激活', { 
      positionId, 
      orderType: updatedPosition.order_type,
      status: updatedPosition.status 
    });

    res.json({
      success: true,
      data: updatedPosition
    });

  } catch (error) {
    logger.error('激活仓位失败', { 
      error: error.message, 
      positionId 
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
