/**
 * 管理接口
 * Token 更新、系统状态等
 */

const express = require('express');
const router = express.Router();
const logger = require('../../../utils/logger');
const config = require('../../../config');
const fs = require('fs');
const path = require('path');
const tokenHealthCheck = require('../../discord/tokenHealthCheck');

/**
 * GET /admin/token-update - Token 更新页面（HTML）
 */
router.get('/token-update', (req, res) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Discord Token 更新</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      width: 100%;
      padding: 40px;
    }
    
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
    }
    
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    label {
      display: block;
      margin-bottom: 8px;
      color: #333;
      font-weight: 500;
      font-size: 14px;
    }
    
    textarea {
      width: 100%;
      padding: 12px;
      border: 2px solid #ddd;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      resize: vertical;
      min-height: 100px;
      transition: border-color 0.3s;
    }
    
    textarea:focus {
      outline: none;
      border-color: #667eea;
    }
    
    .token-info {
      background: #f0f4ff;
      border-left: 4px solid #667eea;
      padding: 12px;
      margin-bottom: 20px;
      border-radius: 4px;
      font-size: 13px;
      color: #444;
      line-height: 1.6;
    }
    
    .button-group {
      display: flex;
      gap: 10px;
      margin-top: 30px;
    }
    
    button {
      flex: 1;
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }
    
    .btn-submit {
      background: #667eea;
      color: white;
    }
    
    .btn-submit:hover {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }
    
    .btn-submit:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
    }
    
    .status {
      padding: 12px;
      border-radius: 6px;
      margin-top: 20px;
      font-size: 13px;
      display: none;
    }
    
    .status.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
      display: block;
    }
    
    .status.error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
      display: block;
    }
    
    .status.loading {
      background: #d1ecf1;
      color: #0c5460;
      border: 1px solid #bee5eb;
      display: block;
    }
    
    .guide {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 20px;
      font-size: 13px;
      color: #856404;
      line-height: 1.6;
    }
    
    .guide strong {
      display: block;
      margin-bottom: 8px;
    }
    
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 Discord Token 更新</h1>
    <p class="subtitle">快速更新你的 Discord 认证 token</p>
    
    <div class="guide">
      <strong>📖 如何获取 Token:</strong>
      1. 打开 Discord 网页版 (<a href="https://discord.com" target="_blank">discord.com</a>)<br>
      2. 按 F12 打开开发者工具，切换到 Console<br>
      3. 复制粘贴: <code>(function(){console.log(JSON.parse(localStorage.getItem('token')))})()</code><br>
      4. 按回车，复制完整的 token 字符串
    </div>
    
    <form id="tokenForm">
      <div class="form-group">
        <label for="token">Discord User Token:</label>
        <textarea id="token" name="token" placeholder="在这里粘贴你的 Discord Token（MzA...）" required></textarea>
        <div class="token-info">
          💡 Token 是一个很长的字符串，以 MzA 或 NzA 开头
        </div>
      </div>
      
      <div class="button-group">
        <button type="submit" class="btn-submit">✅ 更新并重启应用</button>
      </div>
    </form>
    
    <div id="status" class="status"></div>
  </div>
  
  <script>
    const form = document.getElementById('tokenForm');
    const statusEl = document.getElementById('status');
    const tokenEl = document.getElementById('token');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const token = tokenEl.value.trim();
      
      if (!token) {
        showStatus('请输入 Token', 'error');
        return;
      }
      
      if (token.length < 50) {
        showStatus('Token 太短，请检查是否完整', 'error');
        return;
      }
      
      showStatus('正在更新 Token...', 'loading');
      
      try {
        const response = await fetch('/admin/api/token/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
          showStatus('✅ Token 已更新！应用将在 5 秒内重启...', 'success');
          setTimeout(() => {
            location.reload();
          }, 5000);
        } else {
          showStatus('❌ ' + (data.error || '更新失败'), 'error');
        }
      } catch (error) {
        showStatus('❌ 请求失败: ' + error.message, 'error');
      }
    });
    
    function showStatus(message, type) {
      statusEl.textContent = message;
      statusEl.className = 'status ' + type;
    }
    
    // 自动焦点到输入框
    tokenEl.focus();
  </script>
</body>
</html>
  `;
  
  res.send(html);
});

/**
 * POST /admin/api/token/update - 更新 Token
 */
router.post('/api/token/update', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        error: 'Token 格式不正确',
      });
    }

    if (token.length < 50) {
      return res.status(400).json({
        error: 'Token 太短，可能不完整',
      });
    }

    logger.info('更新 Discord Token', { tokenLength: token.length });

    // 验证 token
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: token,
        'User-Agent': 'Discord Trading Signal Collector',
      },
    });

    if (!response.ok) {
      logger.error('Token 验证失败', {
        status: response.status,
      });

      return res.status(400).json({
        error: 'Token 无效或已过期（Discord 返回 ' + response.status + '）',
      });
    }

    const user = await response.json();

    // 更新 .env 文件
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');

      if (envContent.includes('DISCORD_USER_TOKEN=')) {
        envContent = envContent.replace(
          /DISCORD_USER_TOKEN=.*/,
          `DISCORD_USER_TOKEN=${token}`
        );
      } else {
        envContent += `\nDISCORD_USER_TOKEN=${token}\n`;
      }
    } else {
      envContent = `DISCORD_USER_TOKEN=${token}\n`;
    }

    fs.writeFileSync(envPath, envContent);

    logger.info('✅ Token 已更新', {
      username: user.username,
      userId: user.id,
    });

    res.json({
      success: true,
      message: 'Token 已验证并保存',
      user: {
        username: user.username,
        id: user.id,
      },
    });

    // 5 秒后重启应用
    setTimeout(() => {
      logger.info('重启应用以使用新 Token');
      process.exit(0);
    }, 5000);
  } catch (error) {
    logger.error('Token 更新错误', { error: error.message });

    res.status(500).json({
      error: 'Token 更新失败: ' + error.message,
    });
  }
});

/**
 * GET /admin/status - 系统状态
 */
router.get('/status', (req, res) => {
  const tokenStatus = tokenHealthCheck.getStatus();

  res.json({
    timestamp: new Date(),
    token: tokenStatus,
    hasToken: !!config.discord.userToken,
  });
});

module.exports = router;
