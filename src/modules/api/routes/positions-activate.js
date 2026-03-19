/**
 * 仓位激活路由
 * PUT /api/v1/positions/:id/activate
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const logger = require('../../../utils/logger');
const PositionRepository = require('../../database/repositories/PositionRepository');
const telegramService = require('../../telegram/telegramService');

/**
 * 激活仓位（将 pending 订单转为 active 订单）
 * PUT /api/v1/positions/:id/activate
 */
router.put('/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    const { entry, size } = req.body;

    logger.info('Activating position', { id, entry, size });

    // 获取当前仓位
    const position = await PositionRepository.findById(id);
    if (!position) {
      return res.status(404).json({
        success: false,
        error: `Position not found: ${id}`
      });
    }

    // 检查是否已激活
    if (position.order_type === 'active') {
      return res.status(400).json({
        success: false,
        error: 'Position is already active'
      });
    }

    // 更新仓位
    position.order_type = 'active';
    position.status = 'open';
    
    // 可选：更新入场价和仓位大小
    if (entry !== undefined) {
      position.entry = entry;
      logger.info('Updated entry price', { id, entry });
    }
    if (size !== undefined) {
      position.size = size;
      logger.info('Updated position size', { id, size });
    }

    // 保存到数据库
    await PositionRepository.update(position);

    logger.info('Position activated successfully', { id });

    // 发送 Telegram 通知
    await telegramService.notifyAlert(
      '✅ 仓位已激活',
      `${position.trader} 的 ${position.symbol} 仓位已激活\n` +
      `入场价: ${position.entry}\n` +
      `仓位: ${position.size}`,
      'info'
    );

    res.json({
      success: true,
      data: position
    });

  } catch (error) {
    logger.error('Failed to activate position', {
      error: error.message,
      id: req.params.id
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
