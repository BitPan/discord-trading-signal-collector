/**
 * 从 Discord 读取所有交易员频道的消息并生成总结
 */

const logger = require('../utils/logger');
const config = require('../config');

// 交易员频道映射
const TRADERS = {
  'Eli': {
    channel_id: '767805453517979649',
    display_name: 'trader_eli'
  },
  'Woods': {
    channel_id: '859894868205371392',
    display_name: 'trader_woods'
  },
  'Astekz': {
    channel_id: '800846261707341845',
    display_name: 'trader_astekz'
  }
};

async function fetchAllTradersInsights() {
  const token = config.discord.userToken;
  if (!token) {
    throw new Error('DISCORD_USER_TOKEN not configured');
  }

  const results = {};

  for (const [trader, info] of Object.entries(TRADERS)) {
    try {
      logger.info(`Fetching messages from ${trader} channel...`);
      
      const url = `https://discord.com/api/v10/channels/${info.channel_id}/messages?limit=100`;
      const headers = {
        'Authorization': `${token}`,
        'User-Agent': 'Mozilla/5.0'
      };

      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        logger.warn(`Failed to fetch ${trader} channel: ${response.status}`);
        continue;
      }

      const messages = await response.json();
      
      const analysis = {
        trader: trader,
        total_messages: messages.length,
        participants: {},
        symbols: new Set(),
        actions: new Set(),
        time_range: {
          earliest: messages.length > 0 ? messages[messages.length - 1].timestamp : null,
          latest: messages.length > 0 ? messages[0].timestamp : null
        },
        recent_messages: []
      };

      messages.slice(0, 10).forEach(msg => {
        analysis.recent_messages.push({
          author: msg.author.username,
          content: msg.content.substring(0, 80),
          timestamp: msg.timestamp
        });
      });

      messages.forEach(msg => {
        const author = msg.author.username;
        if (!analysis.participants[author]) {
          analysis.participants[author] = 0;
        }
        analysis.participants[author]++;

        // 提取交易对
        const symbolMatches = msg.content.match(/[A-Z]{2,}USD/g) || [];
        symbolMatches.forEach(s => analysis.symbols.add(s));

        // 提取操作类型
        if (msg.content.match(/OPEN|LONG|BUY/i)) {
          analysis.actions.add('OPEN/LONG');
        }
        if (msg.content.match(/CLOSE|SHORT|SELL/i)) {
          analysis.actions.add('CLOSE/SHORT');
        }
      });

      analysis.symbols = Array.from(analysis.symbols);
      analysis.actions = Array.from(analysis.actions);
      
      results[trader] = analysis;
      logger.info(`✓ ${trader}: ${messages.length} messages analyzed`);
    } catch (error) {
      logger.error(`Error fetching ${trader}:`, { error: error.message });
    }
  }

  // 显示结果
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║         所有交易员频道分析（过去 100 条）           ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  for (const [trader, analysis] of Object.entries(results)) {
    console.log(`\n📊 ${trader} 频道`);
    console.log('─'.repeat(50));
    console.log(`  消息总数：${analysis.total_messages}`);
    console.log(`  交易对：${analysis.symbols.join(', ') || '未检测到'}`);
    console.log(`  操作类型：${analysis.actions.join(', ') || '未检测到'}`);
    console.log(`  时间范围：${analysis.time_range.earliest ? analysis.time_range.earliest.substring(0, 10) : 'N/A'} 至 ${analysis.time_range.latest ? analysis.time_range.latest.substring(0, 10) : 'N/A'}`);
    
    console.log(`\n  👥 参与者（前 5）：`);
    const topParticipants = Object.entries(analysis.participants)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    topParticipants.forEach(([name, count]) => {
      console.log(`    - ${name}: ${count} 条消息`);
    });

    console.log(`\n  💬 最近消息（前 3）：`);
    analysis.recent_messages.slice(0, 3).forEach((msg, idx) => {
      console.log(`    ${idx + 1}. [${msg.author}] ${msg.content}`);
    });

    console.log(`\n  💡 总结：`);
    const summary = generateSummary(trader, analysis);
    console.log(`    ${summary}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ 分析完成！');
  process.exit(0);
}

function generateSummary(trader, analysis) {
  const { total_messages, symbols, actions, participants } = analysis;
  
  let summary = `${trader} 频道过去 100 条消息中`;
  
  if (symbols.length > 0) {
    summary += `关注了 ${symbols.join(', ')}`;
  } else {
    summary += `未检测到具体交易对`;
  }
  
  if (actions.length > 0) {
    summary += `，涉及 ${actions.join('和')}`;
  }
  
  summary += `。共有 ${Object.keys(participants).length} 位参与者`;
  
  const topTrader = Object.entries(participants)
    .sort((a, b) => b[1] - a[1])[0];
  
  if (topTrader) {
    summary += `，其中 ${topTrader[0]} 最活跃（${topTrader[1]} 条）`;
  }
  
  summary += `。`;
  
  return summary;
}

// 运行
fetchAllTradersInsights().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
