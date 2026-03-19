/**
 * 交易统计 API 路由
 * GET /api/v1/statistics/traders
 * GET /api/v1/statistics/symbols
 * GET /api/v1/statistics/performance
 */

const express = require('express');
const router = express.Router();
const connection = require('../../database/connection');
const logger = require('../../../utils/logger');

/**
 * GET /api/v1/statistics/traders - 交易员统计
 */
router.get('/traders', async (req, res) => {
  try {
    const result = await connection.query(`
      SELECT 
        trader,
        COUNT(*) as total_positions,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_positions,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_positions,
        SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
        SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END) as losing_trades,
        ROUND(SUM(COALESCE(pnl, 0))::numeric, 2) as total_pnl,
        ROUND(AVG(COALESCE(pnl_percent, 0))::numeric, 2) as avg_pnl_percent,
        ROUND(MAX(COALESCE(pnl, 0))::numeric, 2) as max_pnl,
        ROUND(MIN(COALESCE(pnl, 0))::numeric, 2) as min_pnl,
        ROUND((SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::numeric / 
               NULLIF(SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END), 0) * 100)::numeric, 2) as win_rate
      FROM positions
      GROUP BY trader
      ORDER BY total_pnl DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Failed to get trader statistics', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/statistics/symbols - 交易对统计
 */
router.get('/symbols', async (req, res) => {
  try {
    const result = await connection.query(`
      SELECT 
        symbol,
        COUNT(*) as total_trades,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_trades,
        ROUND(SUM(COALESCE(pnl, 0))::numeric, 2) as total_pnl,
        ROUND(AVG(COALESCE(pnl_percent, 0))::numeric, 2) as avg_pnl_percent,
        ROUND((SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::numeric / 
               NULLIF(SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END), 0) * 100)::numeric, 2) as win_rate
      FROM positions
      GROUP BY symbol
      ORDER BY total_pnl DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Failed to get symbol statistics', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/statistics/performance - 性能统计（按时间段）
 */
router.get('/performance', async (req, res) => {
  try {
    const period = req.query.period || 'day'; // day, week, month

    let dateGroup;

    switch(period) {
      case 'week':
        dateGroup = "DATE_TRUNC('week', closed_at)::date";
        break;
      case 'month':
        dateGroup = "DATE_TRUNC('month', closed_at)::date";
        break;
      default: // day
        dateGroup = "DATE_TRUNC('day', closed_at)::date";
    }

    const result = await connection.query(`
      SELECT 
        ${dateGroup} as period,
        COUNT(*) as total_trades,
        SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
        SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END) as losing_trades,
        ROUND(SUM(COALESCE(pnl, 0))::numeric, 2) as daily_pnl,
        ROUND(AVG(COALESCE(pnl_percent, 0))::numeric, 2) as avg_pnl_percent,
        ROUND((SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::numeric / 
               COUNT(*)::numeric * 100)::numeric, 2) as win_rate
      FROM positions
      WHERE status = 'closed'
      GROUP BY period
      ORDER BY period DESC
      LIMIT 30
    `);

    res.json({
      success: true,
      period: period,
      data: result.rows
    });

  } catch (error) {
    logger.error('Failed to get performance statistics', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/statistics/summary - 总体统计
 */
router.get('/summary', async (req, res) => {
  try {
    const result = await connection.query(`
      SELECT 
        COUNT(*) as total_positions,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_positions,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_positions,
        SUM(CASE WHEN order_type = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        ROUND(SUM(COALESCE(pnl, 0))::numeric, 2) as total_pnl,
        ROUND(AVG(COALESCE(pnl_percent, 0))::numeric, 2) as avg_pnl_percent,
        ROUND((SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::numeric / 
               NULLIF(SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END), 0) * 100)::numeric, 2) as win_rate,
        COUNT(DISTINCT trader) as total_traders,
        COUNT(DISTINCT symbol) as total_symbols
      FROM positions
    `);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Failed to get summary statistics', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
