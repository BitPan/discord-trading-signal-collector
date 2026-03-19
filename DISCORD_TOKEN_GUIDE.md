# Discord Token 管理指南

## 📋 Token 类型对比

### 1. User Token（当前使用）
```
特征：
- 格式：MzA... (很长)
- 来源：浏览器 localStorage
- 有效期：不明确（通常很长，但可能被撤销）
- 风险：Discord ToS 禁止使用
```

**问题**：
- ❌ 不稳定（Discord 可能随时撤销）
- ❌ 违反 Discord 服务条款
- ❌ 无法自动刷新（需要重新登录获取）
- ❌ 登出后失效

---

### 2. Bot Token（推荐）
```
特征：
- 格式：OTI... (也很长)
- 来源：Discord Developer Portal
- 有效期：永久（除非你重置）
- 风险：Discord 官方支持
```

**优势**：
- ✅ 稳定可靠
- ✅ 官方支持
- ✅ 可以设置权限
- ✅ 不会因为登录而失效
- ✅ 可以在多个应用使用

---

## 🔧 解决方案

### 短期（2 分钟）- 获取新 User Token

**当前 token 失效时：**

1. Discord 网页 → F12 → Console
2. 运行命令获取新 token
3. 粘贴给我，更新配置

**有效期**：不确定（可能几周/几月）

---

### 长期（推荐）- 迁移到 Bot Token

**优势**：
- 永久有效（可靠）
- 官方支持（安全）
- 更好的权限控制

**步骤**：

#### 步骤 1: 创建 Bot

1. 访问 https://discord.com/developers/applications
2. 点击 "New Application"
3. 输入名字（如 "Trading Signal Bot"）
4. 切换到 "Bot" 标签
5. 点击 "Add Bot"

#### 步骤 2: 获取 Bot Token

```
在 "Build-A-Bot" 下
点击 "Reset Token"
复制显示的 token（格式：OTI...）
```

#### 步骤 3: 配置权限

在 "Bot Permissions" 勾选：
```
✅ Read Messages/View Channels
✅ Send Messages
✅ Read Message History
✅ View Audit Log
```

#### 步骤 4: 邀请 Bot 到服务器

```
生成 OAuth2 URL：
- Scopes: bot
- Permissions: 勾上面的权限

点击生成的链接，选择服务器邀请 Bot
```

#### 步骤 5: 更新代码配置

```javascript
// 从：
const userToken = "MzA...";

// 改为：
const botToken = "OTI...";
```

---

## 🔄 自动刷新机制（高级）

如果继续用 User Token，可以实现自动重新获取：

### 方案 1：轮询重新获取（每周）

```javascript
// 每周重新获取一次 token
setInterval(async () => {
  const newToken = await getNewUserToken();
  updateConfig(newToken);
  logger.info('User token refreshed');
}, 7 * 24 * 60 * 60 * 1000); // 7 天
```

### 方案 2：错误时自动重试

```javascript
async function discordConnect(token) {
  try {
    await client.login(token);
  } catch (error) {
    if (error.message.includes('invalid token')) {
      logger.warn('Token invalid, requesting new one...');
      
      // 发送通知给用户获取新 token
      await telegramService.notify(
        'Discord token expired',
        'Please visit: https://discord.com\n' +
        'F12 → Console → run:\n' +
        '(function(){console.log(JSON.parse(localStorage.getItem("token")))})()'
      );
      
      // 等待用户手动提供新 token
      // 或者尝试其他恢复机制
    }
  }
}
```

---

## 📊 对比表

| 功能 | User Token | Bot Token |
|------|-----------|----------|
| 有效期 | 不确定 | ✅ 永久 |
| 官方支持 | ❌ ToS 禁止 | ✅ 官方 |
| 自动刷新 | ❌ 不支持 | ✅ 可配置 |
| 权限控制 | ❌ 完全访问 | ✅ 细粒度 |
| 多应用使用 | ❌ 不建议 | ✅ 可以 |
| 稳定性 | ⚠️ 低 | ✅ 高 |

---

## 🎯 建议路线

### 现在（应急）
1. 获取新 User Token
2. 更新配置
3. 恢复推送

### 本周（优化）
1. 创建专用 Discord Bot
2. 迁移到 Bot Token
3. 删除 User Token 依赖

### 未来（自动化）
1. 实现 token 自动刷新机制
2. 添加 token 过期告警
3. 多 token 备份方案

---

## ⚠️ 安全注意

```
❌ 不要做
- 在代码中硬编码 token
- 在 Git 中提交 token
- 分享 token 给他人
- 在日志中打印 token

✅ 要做
- token 存储在 .env 文件
- .env 加入 .gitignore
- 定期轮换 token
- 只在必要时显示 token 的前几位
```

---

## 实施计划

### Phase 1: 应急修复（现在）
- 获取新 User Token
- 更新配置
- 验证连接

### Phase 2: 迁移准备（2-3 天）
- 创建 Discord Bot
- 测试 Bot Token
- 准备代码迁移

### Phase 3: 完整迁移（1 周内）
- 切换到 Bot Token
- 删除 User Token 代码
- 实现自动刷新

### Phase 4: 自动化（可选）
- Token 过期告警
- 自动重连机制
- 监控 Discord 连接状态

---

## 📞 当前建议

**立即：**
1. 获取新 User Token（快速恢复）
2. 我来更新配置
3. 恢复推送功能

**本周：**
1. 创建 Discord Bot（永久解决）
2. 迁移代码
3. 配置自动刷新

---

**选择：**
1. 先用新 User Token 应急？
2. 直接创建 Bot Token 做长期方案？

