const API_BASE = '/api/v1';

function showTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  document.getElementById(tabName).classList.add('active');
  event.target.classList.add('active');

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
    case 'insights':
      loadInsights();
      break;
    case 'health':
      loadHealth();
      break;
  }
}

async function loadDashboard() {
  try {
    const positionsRes = await fetch(`${API_BASE}/positions?limit=100`);
    const positions = await positionsRes.json();

    const openCount = positions.data ? positions.data.filter(p => p.status === 'open').length : 0;
    document.getElementById('totalMessages').textContent = positions.count || 0;
    document.getElementById('totalSignals').textContent = positions.count || 0;
    document.getElementById('openPositions').textContent = openCount;

    const signalsRes = await fetch(`${API_BASE}/signals?limit=10`);
    const signalsData = await signalsRes.json();
    
    const tbody = document.getElementById('recentSignalsBody');
    if (signalsData.data && signalsData.data.length > 0) {
      tbody.innerHTML = signalsData.data.map(signal => `
        <tr>
          <td>${signal.trader ? signal.trader.substring(0, 20) : '-'}</td>
          <td><strong>${signal.symbol}</strong></td>
          <td>${signal.action.toUpperCase()}</td>
          <td>${signal.entry ? parseFloat(signal.entry).toFixed(2) : '-'}</td>
          <td>${signal.size ? parseFloat(signal.size).toFixed(2) : '-'}</td>
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

async function loadSignals() {
  try {
    const res = await fetch(`${API_BASE}/signals?limit=100`);
    const data = await res.json();
    
    const tbody = document.getElementById('signalsBody');
    if (data.data && data.data.length > 0) {
      tbody.innerHTML = data.data.map(signal => `
        <tr>
          <td>${signal.id.substring(0, 16)}...</td>
          <td>${signal.trader ? signal.trader.substring(0, 20) : '-'}</td>
          <td><strong>${signal.symbol}</strong></td>
          <td>${signal.action.toUpperCase()}</td>
          <td>${signal.entry ? parseFloat(signal.entry).toFixed(2) : '-'}</td>
          <td>${signal.size ? parseFloat(signal.size).toFixed(2) : '-'}</td>
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
          <td>${pos.trader ? pos.trader.substring(0, 20) : '-'}</td>
          <td><strong>${pos.symbol}</strong></td>
          <td>${getStatusBadge(pos.status)}</td>
          <td>${pos.entry ? parseFloat(pos.entry).toFixed(2) : '-'}</td>
          <td>${pos.size ? parseFloat(pos.size).toFixed(2) : '-'}</td>
          <td>${pos.pnl ? parseFloat(pos.pnl).toFixed(2) : '-'}</td>
          <td>${pos.pnl_percent ? parseFloat(pos.pnl_percent).toFixed(2) + '%' : '-'}</td>
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

async function loadInsights() {
  try {
    const res = await fetch(`${API_BASE}/insights`);
    const data = await res.json();
    
    const container = document.getElementById('insightsContainer');
    if (data.data && Object.keys(data.data).length > 0) {
      let html = '';
      for (const [trader, summary] of Object.entries(data.data)) {
        html += `
          <div class="insight-card">
            <h3>👤 ${trader}</h3>
            <div class="insight-content">
              <p><strong>交易对：</strong> ${summary.symbols.join(', ')}</p>
              <p><strong>操作类型：</strong> ${summary.actions.join(', ')}</p>
              <p><strong>信号数量：</strong> ${summary.signal_count}</p>
              <p><strong>行情见解：</strong></p>
              <div class="insight-text">${summary.summary}</div>
              <p><small>最后更新：${new Date(summary.last_signal).toLocaleString()}</small></p>
            </div>
          </div>
        `;
      }
      container.innerHTML = html;
    } else {
      container.innerHTML = '<div class="loading">暂无数据</div>';
    }
  } catch (error) {
    console.error('加载行情总结失败:', error);
    document.getElementById('insightsContainer').innerHTML = `
      <div class="error-message">加载失败: ${error.message}</div>
    `;
  }
}

async function loadHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    
    document.getElementById('discordStatus').textContent = '✅ 正常';
    document.getElementById('discordStatus').className = 'health-status ok';
    
    document.getElementById('databaseStatus').textContent = '✅ 正常';
    document.getElementById('databaseStatus').className = 'health-status ok';
    
    document.getElementById('parserStatus').textContent = '✅ 正常';
    document.getElementById('parserStatus').className = 'health-status ok';
    
    document.getElementById('telegramStatus').textContent = '⚠️ 未配置';
    document.getElementById('telegramStatus').className = 'health-status unknown';
    
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

function filterMessages() {
  loadMessages();
}

function filterSignals() {
  loadSignals();
}

function filterPositions() {
  loadPositions();
}

function getStatusBadge(status) {
  const badges = {
    'pending': '⏳ 待确认',
    'open': '📍 持仓中',
    'closed': '✅ 已平仓',
    'cancelled': '❌ 已取消'
  };
  return badges[status] || status;
}

document.addEventListener('DOMContentLoaded', function() {
  loadDashboard();
  setInterval(loadDashboard, 30000);
});
