/**
 * 从 Discord 实时获取 John 频道的消息并生成总结
 */

const logger = require('../utils/logger');
const config = require('../config');
const { Client, ChannelType } = require('discord.js');

const JOHN_CHANNEL_ID = '743220645852086333';

async function fetchJohnInsights() {
  const client = new Client({ 
    intents: ['Guilds', 'GuildMessages', 'MessageContent', 'DirectMessages']
  });

  try {
    logger.info('Connecting to Discord...');
    
    // 使用用户token登录（需要特殊处理，因为Discord不正式支持用户bot）
    const token = config.discord.userToken;
    if (!token) {
      throw new Error('DISCORD_USER_TOKEN not configured');
    }

    // 对于用户账户，我们需要使用不同的方法
    // 这里使用 discord.js-selfbot-v13 或其他库可能更合适
    // 但我们可以用原生的方法
    
    logger.info(`Fetching messages from channel: ${JOHN_CHANNEL_ID}`);
    
    // 由于discord.js限制，用户token登录有困难
    // 我们改用REST API直接读取（如果权限允许）
    
    logger.warn('Note: User token auth in discord.js requires special setup');
    logger.info('Attempting to fetch via REST API instead...');
    
    // 使用fetch直接从Discord REST API读取
    const url = `https://discord.com/api/v10/channels/${JOHN_CHANNEL_ID}/messages?limit=100`;
    const headers = {
      'Authorization': `${token}`,
      'User-Agent': 'Mozilla/5.0'
    };

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    }

    const messages = await response.json();
    
    logger.info(`Fetched ${messages.length} messages from John's channel`);
    
    // 分析消息内容生成总结
    const analysis = {
      total_messages: messages.length,
      traders: {},
      symbols: new Set(),
      actions: [],
      time_range: {
        earliest: messages.length > 0 ? messages[messages.length - 1].timestamp : null,
        latest: messages.length > 0 ? messages[0].timestamp : null
      }
    };

    messages.forEach(msg => {
      const author = msg.author.username;
      if (!analysis.traders[author]) {
        analysis.traders[author] = {
          messages: 0,
          content: []
        };
      }
      
      analysis.traders[author].messages++;
      analysis.traders[author].content.push({
        content: msg.content.substring(0, 100),
        timestamp: msg.timestamp
      });

      // 提取交易对（简单的正则匹配）
      const symbolMatches = msg.content.match(/[A-Z]{2,}USD/g) || [];
      symbolMatches.forEach(s => analysis.symbols.add(s));

      // 提取操作类型
      if (msg.content.match(/OPEN|LONG|BUY/i)) {
        analysis.actions.push('OPEN/LONG');
      }
      if (msg.content.match(/CLOSE|SHORT|SELL/i)) {
        analysis.actions.push('CLOSE/SHORT');
      }
    });

    analysis.symbols = Array.from(analysis.symbols);
    analysis.actions = [...new Set(analysis.actions)];

    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║   John 频道消息分析（过去 100 条）         ║');
    console.log('╚═══════════════════════════════════════════╝\n');

    console.log('📊 基本统计：');
    console.log(`  - 总消息数：${analysis.total_messages}`);
    console.log(`  - 交易对：${analysis.symbols.join(', ') || '未检测到'}`);
    console.log(`  - 操作类型：${analysis.actions.join(', ') || '未检测到'}`);
    console.log(`  - 时间范围：${analysis.time_range.earliest} 至 ${analysis.time_range.latest}`);

    console.log('\n👥 参与者分析：');
    Object.entries(analysis.traders).forEach(([trader, data]) => {
      console.log(`  ${trader}：${data.messages} 条消息`);
      if (data.content.length > 0) {
        console.log(`    最近消息：${data.content[0].content}`);
      }
    });

    console.log('\n💡 总结：');
    const summary = generateSummary(analysis);
    console.log(`  ${summary}`);

    process.exit(0);
  } catch (error) {
    logger.error('Failed to fetch John insights:', {
      error: error.message,
      stack: error.stack
    });
    console.log('\n❌ 获取失败');
    console.log(`错误：${error.message}`);
    console.log('\n提示：如果使用用户token登录失败，可能需要：');
    console.log('  1. 检查token是否有效');
    console.log('  2. 检查频道权限');
    console.log('  3. 使用官方bot token而不是用户token');
    process.exit(1);
  }
}

function generateSummary(analysis) {
  const { total_messages, symbols, actions, traders } = analysis;
  
  let summary = `John 频道在过去的消息中`;
  
  if (symbols.length > 0) {
    summary += `关注了 ${symbols.join(', ')} 等交易对`;
  }
  
  if (actions.length > 0) {
    summary += `，涉及 ${actions.join('和')} 操作`;
  }
  
  summary += `。共有 ${Object.keys(traders).length} 位交易员参与讨论，`;
  
  const maxTrader = Object.entries(traders).reduce((max, [name, data]) => 
    data.messages > max[1] ? [name, data.messages] : max, ['', 0]);
  
  if (maxTrader[0]) {
    summary += `其中 ${maxTrader[0]} 最活跃（${maxTrader[1]} 条消息）。`;
  }
  
  return summary;
}

// 运行
fetchJohnInsights();
