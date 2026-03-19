/**
 * 行情总结 API 路由
 */

const router = require('express').Router();
const connection = require('../../database/connection');
const { asyncHandler } = require('../../../utils/errorHandler');

/**
 * GET /api/v1/insights - 获取交易员行情总结
 */
router.get('/', asyncHandler(async (req, res) => {
  const query = `
    SELECT 
      s.trader,
      array_agg(DISTINCT s.symbol) as symbols,
      array_agg(DISTINCT s.action) as actions,
      COUNT(*) as signal_count,
      MAX(s.created_at) as last_signal,
      string_agg(DISTINCT s.symbol, ', ') as symbol_list
    FROM signals s
    WHERE s.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY s.trader
    ORDER BY MAX(s.created_at) DESC
  `;

  try {
    const result = await connection.query(query);
    
    const insights = {};
    
    result.rows.forEach(row => {
      const symbols = row.symbols || [];
      const actions = row.actions || [];
      const symbolList = symbols.join(', ');
      
      // 生成行情见解总结
      let summary = `${row.trader} 在过去30天内`;
      
      if (actions.includes('open') && actions.includes('close')) {
        summary += `对 ${symbolList} 进行了开仓和平仓操作`;
      } else if (actions.includes('open')) {
        summary += `对 ${symbolList} 进行了${row.signal_count}次开仓操作`;
      } else if (actions.includes('close')) {
        summary += `对 ${symbolList} 进行了${row.signal_count}次平仓操作`;
      }
      
      summary += `。主要交易对包括：${symbolList}。`;
      
      // 根据信号数量给出评价
      if (row.signal_count >= 10) {
        summary += ` 交易活跃度高，信号频繁。`;
      } else if (row.signal_count >= 5) {
        summary += ` 交易活跃度中等。`;
      } else {
        summary += ` 交易活跃度较低。`;
      }

      insights[row.trader] = {
        symbols: symbols,
        actions: actions,
        signal_count: row.signal_count,
        last_signal: row.last_signal,
        summary: summary
      };
    });

    res.json({
      success: true,
      data: insights,
      count: Object.keys(insights).length
    });
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: error.message
      }
    });
  }
}));

module.exports = router;
