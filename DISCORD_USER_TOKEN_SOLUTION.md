# User Token 长期使用方案

## 情况分析

```
限制：无法邀请自己的 Bot 到别人的服务器
现状：只能使用 User Token
目标：让 User Token 尽可能稳定运行
```

---

## 🎯 可行方案（3 选 1）

### 方案 A：自动告警 + 手动更新（最稳定）

**核心思想**：
- Token 失效时自动检测
- 发送 Telegram 告警
- 用户在 30 秒内手动更新（通过 Web UI）
- 无需代码改动，最安全

**实现**：

```javascript
// 1. 定期检查 token 是否失效
async function checkTokenHealth() {
  try {
    await discordClient.ping();
    logger.info('Discord connection healthy');
  } catch (error) {
    if (error.message.includes('invalid token')) {
      // Token 失效！
      await telegramService.notify(
        '🚨 Discord Token 已失效',
        '请立即更新：\n' +
        '1. Discord 网页版 → F12 → Console\n' +
        '2. 运行：(function(){console.log(JSON.parse(localStorage.getItem("token")))})()\n' +
        '3. 访问 http://localhost:3000/admin/update-token\n' +
        '4. 粘贴新 token\n' +
        '5. 系统自动重连'
      );
      
      // 设置重试计时器
      startTokenUpdateWatchdog();
    }
  }
}

// 定期检查（每 30 分钟）
setInterval(checkTokenHealth, 30 * 60 * 1000);
```

**优点**：
- ✅ 100% 安全（不自动化敏感操作）
- ✅ 用户完全控制
- ✅ 支持立即恢复

---

### 方案 B：自动刷新 + 无缝重连（中等复杂）

**核心思想**：
- 每周自动在后台重新获取 token
- 使用 Puppeteer 自动化登录 Discord
- 无需用户干预

**风险**：
- ⚠️ 需要自动化登录（Puppeteer）
- ⚠️ 如果 Discord 账户启用了 2FA 会失败

**实现**：

```javascript
const puppeteer = require('puppeteer');

async function autoRefreshToken() {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // 登录 Discord
    await page.goto('https://discord.com/login');
    await page.type('input[name="email"]', process.env.DISCORD_EMAIL);
    await page.type('input[name="password"]', process.env.DISCORD_PASSWORD);
    await page.click('button[type="submit"]');
    
    // 等待登录完成
    await page.waitForNavigation();
    
    // 从 localStorage 获取 token
    const token = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('token'));
    });
    
    // 更新配置
    updateConfig({ DISCORD_USER_TOKEN: token });
    
    // 重启 Discord 连接
    await discordClient.reconnect();
    
    logger.info('Token auto-refreshed successfully');
    
    await browser.close();
  } catch (error) {
    logger.error('Token auto-refresh failed', { error: error.message });
    // 告警用户
    await telegramService.notify('Token 自动刷新失败，请手动更新');
  }
}

// 每 7 天自动刷新一次
setInterval(autoRefreshToken, 7 * 24 * 60 * 60 * 1000);
```

**优点**：
- ✅ 自动刷新，无需人工
- ✅ 相对可靠

**缺点**：
- ❌ 增加依赖（Puppeteer）
- ❌ 如果启用 2FA 会失败
- ❌ 每周一次，中间还是可能失效

---

### 方案 C：征求服务器所有者 + Bot 混合（最优）

**核心思想**：
- 征求服务器所有者
- 邀请一个专用 Bot 到服务器
- User Token 作为备份

**建议的对话**：

```
"我想在 Discord 上自动监控交易信号。
需要邀请一个 Bot 到服务器。
这个 Bot 仅用于读取消息，不会有其他权限。
可以吗？"
```

**优点**：
- ✅ 最稳定（Bot Token 永久有效）
- ✅ 官方支持
- ✅ 最少维护

---

## 📋 推荐路线

### 立即（今天）
```
使用方案 A（自动告警）：
1. 获取新 User Token（手动）
2. 实现 token 失效检测
3. Telegram 告警用户
4. 提供 Web UI 快速更新
```

### 本周
```
询问服务器所有者：
- "能否邀请一个信号监控 Bot？"
- 如果同意 → 迁移到方案 C（Bot Token）
- 如果拒绝 → 继续使用方案 A + 可选 B
```

### 长期
```
如果必须用 User Token：
方案 A + B 组合
- A：主要方案（告警 + 手动更新）
- B：可选的自动刷新（如果用户没有 2FA）
```

---

## 🛠️ 快速实施（方案 A）

### Step 1: 添加 Token 失效检测

```javascript
// src/modules/discord/healthCheck.js
const logger = require('../../utils/logger');
const telegramService = require('../telegram/telegramService');

async function checkDiscordHealth() {
  try {
    // 尝试执行一个简单操作
    await discordClient.user.fetch();
    
    logger.info('Discord connection healthy');
    return { healthy: true };
  } catch (error) {
    if (error.message.includes('invalid token')) {
      logger.error('Discord token invalid - needs refresh');
      
      await telegramService.notify(
        '🚨 Discord Token 已失效',
        '需要更新 token:\n' +
        '1. Discord → F12 → Console\n' +
        '2. (function(){console.log(JSON.parse(localStorage.getItem("token")))})()\n' +
        '3. 访问: http://localhost:3000/token/update'
      );
      
      return { healthy: false, reason: 'token_invalid' };
    }
    
    throw error;
  }
}

module.exports = { checkDiscordHealth };
```

### Step 2: 定期检查（每 30 分钟）

```javascript
// 在 src/index.js 中
const { checkDiscordHealth } = require('./modules/discord/healthCheck');

// 启动后开始检查
setInterval(checkDiscordHealth, 30 * 60 * 1000);
```

### Step 3: 添加 Web UI 更新端点

```javascript
// src/modules/api/routes/admin.js
router.post('/token/update', async (req, res) => {
  const { token } = req.body;
  
  try {
    // 验证 token 有效性
    const testClient = new Client();
    await testClient.login(token);
    
    // 更新配置
    config.discord.userToken = token;
    
    // 重新连接
    await discordClient.logout();
    await discordClient.login(token);
    
    res.json({ success: true, message: 'Token updated and connected' });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});
```

---

## 📊 方案对比

| 方案 | 稳定性 | 维护 | 复杂度 | 成本 |
|------|--------|------|--------|------|
| A (告警) | ⭐⭐⭐ | 手动1次/月 | 简单 | 低 |
| B (自动刷新) | ⭐⭐⭐⭐ | 基本无 | 中等 | 中 |
| C (Bot) | ⭐⭐⭐⭐⭐ | 无 | 简单 | 低 |

---

## 🎯 我建议

**现在：**
1. 获取新 User Token
2. 更新配置，恢复推送
3. 实施方案 A（自动告警）

**本周：**
1. 征求服务器所有者能否邀请 Bot
2. 如果可以 → 迁移方案 C（永久解决）
3. 如果不可以 → 完善方案 A + 可选 B

**代码工作量：**
- 方案 A：30 分钟
- 方案 B：2 小时
- 方案 C：10 分钟（需要所有者同意）

---

