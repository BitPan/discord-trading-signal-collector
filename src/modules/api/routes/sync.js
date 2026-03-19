/**
 * 仓位同步 API 路由
 */

const express = require('express');
const router = express.Router();
const logger = require('../../../utils/logger');
const positionSyncService = require('../../position/positionSyncService');

/**
 * GET /api/v1/sync/status
 * 获取仓位同步状态
 */
router.get('/status', (req, res) => {
  try {
    const status = positionSyncService.getSyncStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to get sync status', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/sync/manual
 * 手动触发一次同步
 */
router.post('/manual', async (req, res) => {
  try {
    logger.info('Manual position sync triggered');
    
    // 执行同步（异步，不等待）
    positionSyncService.syncPositions().catch(err => {
      logger.error('Manual sync failed', { error: err.message });
    });

    res.json({
      success: true,
      message: 'Manual sync started'
    });
  } catch (error) {
    logger.error('Failed to trigger manual sync', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
