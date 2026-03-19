// API 基础 URL
const API_BASE = '/api/v1';

// 显示标签页
function showTab(tabName) {
  // 隐藏所有标签页
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // 取消所有按钮的激活状态
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // 显示选中的标签页
  document.getElementById(tabName).classList.add('active');
  event.target.classList.add('active');

  // 加载相应的数据
  switch(tabName) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'messages':
      loadMessages();
      break;
    case 'signals':
      loadSignals();
      break;
    case 'positions':
      loadPositions();
      break;
    case 'traders':
      loadTraders();
      break;
    case 'health':
      loadHealth();
      break;
  }
}

// 加载仪表板
async function loadDashboard() {
  try {
    // 加载统计数据
    const messagesRes = await fetch(`${API_BASE}/messages?limit=0`);
    const signalsRes = await fetch(`${API_BASE}/signals?limit=0`);
    const positionsRes = await fetch(`${API_BASE}/positions?status=open`);

    const messages = await messagesRes.json();
    const signals = await signalsRes.json();
    const positions = await positionsRes.json();

    // 更新统计卡片
    document.getElementById('totalMessages').textContent = messages.count || 0;
    document.getElementById('totalSignals').textContent = signals.count || 0;
    document.getElementById('openPositions').textContent = positions.count || 0;
    document.getElementById('totalTraders').textContent = '计算中...';

    // 加载最近信号
    const recentSignals = await fetch(`${API_BASE}/signals?limit=10`);
    const recentData = await recentSignals.json();
    
    const tbody = document.getElementById('recentSignalsBody');
    if (recentData.data && recentData.data.length > 0) {
      tbody.innerHTML = recentData.data.map(signal => `
        <tr>
          <td>${signal.trader || '-'}</td>
          <td><strong>${signal.symbol}</strong></td>
          <td>${signal.action.toUpperCase()}</td>
          <td>${signal.entry ? signal.entry.toFixed(2) : '-'}</td>
          <td>${signal.size ? signal.size.toFixed(2) : '-'}</td>
          <td>${new Date(signal.created_at).toLocaleString()}</td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="6">暂无数据</td></tr>';
    }
  } catch (error) {
    console.error('加载仪表板失败:', error);
  }
}

// 加载消息
async function loadMessages() {
  try {
    const res = await fetch(`${API_BASE}/messages?limit=100`);
    const data = await res.json();
    
    const tbody = document.getElementById('messagesBody');
    if (data.data && data.data.length > 0) {
      tbody.innerHTML = data.data.map(msg => `
        <tr>
          <td>${msg.id.substring(0, 16)}...</td>
          <td>${msg.discord_username}</td>
          <td>${msg.channel_id}</td>
          <td>${msg.content.substring(0, 50)}...</td>
          <td>${new Date(msg.created_at).toLocaleString()}</td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="5">暂无消息</td></tr>';
    }
  } catch (error) {
    console.error('加载消息失败:', error);
  }
}

// 加载信号
async function loadSignals() {
  try {
    const res = await fetch(`${API_BASE}/signals?limit=100`);
    const data = await res.json();
    
    const tbody = document.getElementById('signalsBody');
    if (data.data && data.data.length > 0) {
      tbody.innerHTML = data.data.map(signal => `
        <tr>
          <td>${signal.id.substring(0, 16)}...</td>
          <td>${signal.trader || '-'}</td>
          <td><strong>${signal.symbol}</strong></td>
          <td>${signal.action.toUpperCase()}</td>
          <td>${signal.entry ? signal.entry.toFixed(2) : '-'}</td>
          <td>${signal.size ? signal.size.toFixed(2) : '-'}</td>
          <td>${signal.type}</td>
          <td>${new Date(signal.created_at).toLocaleString()}</td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="8">暂无信号</td></tr>';
    }
  } catch (error) {
    console.error('加载信号失败:', error);
  }
}

// 加载仓位
async function loadPositions() {
  try {
    const status = document.getElementById('positionStatusFilter').value;
    const url = status 
      ? `${API_BASE}/positions?status=${status}&limit=100`
      : `${API_BASE}/positions?limit=100`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    const tbody = document.getElementById('positionsBody');
    if (data.data && data.data.length > 0) {
      tbody.innerHTML = data.data.map(pos => `
        <tr>
          <td>${pos.id.substring(0, 16)}...</td>
          <td>${pos.trader || '-'}</td>
          <td><strong>${pos.symbol}</strong></td>
          <td>${getStatusBadge(pos.status)}</td>
          <td>${pos.entry ? pos.entry.toFixed(2) : '-'}</td>
          <td>${pos.size ? pos.size.toFixed(2) : '-'}</td>
          <td>${pos.pnl ? pos.pnl.toFixed(2) : '-'}</td>
          <td>${pos.pnl_percent ? pos.pnl_percent.toFixed(2) + '%' : '-'}</td>
          <td>${new Date(pos.created_at).toLocaleString()}</td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="9">暂无仓位</td></tr>';
    }
  } catch (error) {
    console.error('加载仓位失败:', error);
  }
}

// 加载交易员
async function loadTraders() {
  try {
    const res = await fetch(`${API_BASE}/traders`);
    const data = await res.json();
    
    const tbody = document.getElementById('tradersBody');
    if (data.data && data.data.length > 0) {
      tbody.innerHTML = data.data.map(trader => `
        <tr>
          <td>${trader.id}</td>
          <td>${trader.username || '-'}</td>
          <td>${trader.total_positions || 0}</td>
          <td>${trader.win_rate || '0%'}</td>
          <td>${trader.total_pnl ? trader.total_pnl.toFixed(2) : '0'}</td>
          <td>${trader.avg_pnl ? trader.avg_pnl.toFixed(2) : '0'}</td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="6">暂无交易员</td></tr>';
    }
  } catch (error) {
    console.error('加载交易员失败:', error);
  }
}

// 加载系统健康状态
async function loadHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    
    // 更新系统模块状态（模拟）
    document.getElementById('discordStatus').textContent = '✅ 正常';
    document.getElementById('discordStatus').className = 'health-status ok';
    
    document.getElementById('databaseStatus').textContent = '✅ 正常';
    document.getElementById('databaseStatus').className = 'health-status ok';
    
    document.getElementById('parserStatus').textContent = '✅ 正常';
    document.getElementById('parserStatus').className = 'health-status ok';
    
    document.getElementById('telegramStatus').textContent = '⚠️ 未配置';
    document.getElementById('telegramStatus').className = 'health-status unknown';
    
    // 更新系统信息
    const info = `
系统状态: ${data.status}
运行时间: ${Math.floor(data.uptime)} 秒
时间戳: ${data.timestamp}
API 版本: v1.0.0
数据库: PostgreSQL
Node.js: ${process.version}
    `;
    
    document.getElementById('healthInfo').textContent = info;
  } catch (error) {
    console.error('加载健康状态失败:', error);
  }
}

// 筛选函数
function filterMessages() {
  loadMessages();
}

function filterSignals() {
  loadSignals();
}

function filterPositions() {
  loadPositions();
}

// 获取状态徽章
function getStatusBadge(status) {
  const badges = {
    'pending': '⏳ 待确认',
    'open': '📍 持仓中',
    'closed': '✅ 已平仓',
    'cancelled': '❌ 已取消'
  };
  return badges[status] || status;
}

// 页面加载完成时加载仪表板
document.addEventListener('DOMContentLoaded', function() {
  loadDashboard();
  
  // 每 30 秒自动刷新仪表板
  setInterval(loadDashboard, 30000);
});
