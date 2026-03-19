# Discord Token 自动刷新设置

## ⚠️ 重要说明

**自动刷新需要你的 Discord 账户凭据（邮箱 + 密码）**

为了安全，这些信息：
- ✅ 仅用于自动登录获取 token
- ✅ 不会被上传到 GitHub
- ✅ 存储在本地 .env 文件中
- ✅ 需要你自己管理和备份

---

## 快速开始（3 步）

### 步骤 1：运行设置脚本

```bash
node src/scripts/setup-token-refresh.js
```

脚本会提示你输入：
1. Discord 账户邮箱
2. Discord 账户密码

示例：
```
请输入 Discord 账户邮箱: your.email@example.com
请输入 Discord 账户密码: your_password
```

### 步骤 2：完成 2FA（如果启用）

如果你的 Discord 账户启用了 2FA：
1. 脚本会打开浏览器自动登录
2. 你需要在浏览器中完成 2FA 认证
3. 脚本会自动继续并获取 token

### 步骤 3：重启应用

```bash
npm start
```

---

## 工作原理

```
【启动时】
  应用读取 .env 配置
    ↓
  如果配置了 DISCORD_EMAIL 和 DISCORD_PASSWORD
    ↓
  启动自动刷新服务
    ↓
  【每 7 天】
    自动登录 Discord
      ↓
    获取新 Token
      ↓
    验证 Token 有效性
      ↓
    更新 .env 和配置
      ↓
    发送 Telegram 通知
```

---

## 配置项

在 `.env` 文件中添加：

```env
# Discord User Token 自动刷新配置
DISCORD_AUTO_REFRESH_ENABLED=true
DISCORD_EMAIL=your.email@example.com
DISCORD_PASSWORD=your_password
DISCORD_REFRESH_INTERVAL_DAYS=7
```

---

## 手动运行刷新

如果不想等 7 天，可以手动运行：

```bash
node src/scripts/setup-token-refresh.js <email> <password>
```

例如：
```bash
node src/scripts/setup-token-refresh.js user@example.com password123
```

---

## 故障排查

### 问题 1：2FA 认证超时

**症状**：脚本等待 5 分钟后超时

**解决**：
1. 手动登录到 https://discord.com
2. 完成 2FA 认证
3. 重新运行脚本

### 问题 2：邮箱/密码错误

**症状**：登录失败

**解决**：
1. 检查邮箱和密码是否正确
2. 确保没有被 Discord 锁定（尝试在网页版登录）
3. 重新运行脚本

### 问题 3：Token 验证失败

**症状**：Token 获取但验证失败

**解决**：
1. 检查网络连接
2. 可能是 Discord API 临时故障，等待后重试
3. 查看日志获取详细错误信息

---

## 安全注意

```
❌ 不要做
- 不要在代码中硬编码密码
- 不要提交 .env 文件到 Git
- 不要分享你的凭据

✅ 要做
- 凭据只存储在本地 .env
- 定期更改密码
- 使用强密码
- .env 加入 .gitignore
```

---

## 监控和告警

自动刷新的状态会记录在日志中：

```bash
# 查看日志
tail -f ./logs/app.log | grep -i "token\|refresh"
```

**成功日志**：
```
2026-03-20 10:00:00 [info]: ✅ Token auto-refreshed successfully
```

**失败日志**：
```
2026-03-20 10:00:00 [error]: Scheduled token refresh failed
```

当刷新失败时，会发送 Telegram 告警。

---

## 禁用自动刷新

如果要禁用，编辑 `.env`：

```env
DISCORD_AUTO_REFRESH_ENABLED=false
```

或删除相关配置项。

---

## 高级配置

### 修改刷新周期

默认 7 天，可以修改为其他值（单位：天）：

```env
DISCORD_REFRESH_INTERVAL_DAYS=3
```

### 多个账户

如果有多个 Discord 账户，可以：
1. 创建多个应用实例
2. 每个实例配置不同的账户凭据
3. 独立管理 token

---

## 常见问题

**Q: Token 被盗怎么办？**
A: 立即注销 Discord 网页版，这会使所有 token 失效。然后重新运行设置脚本。

**Q: 支持其他登录方式吗（OAuth、SSO）？**
A: 暂不支持。目前仅支持邮箱 + 密码登录。

**Q: 可以多久不更新一次？**
A: User Token 可以保持很长时间有效，只要账户不登出。但建议定期刷新以降低风险。

**Q: 刷新失败会怎样？**
A: 应用继续使用现有 token。当 token 真正失效时，会发送 Telegram 告警，提示手动刷新。

---

## 下一步

设置完成后，系统将：
1. 每 7 天自动刷新 Token
2. 刷新失败时发送 Telegram 告警
3. 成功时也会发送确认通知
4. 日志中记录所有刷新操作

现在就可以运行：
```bash
node src/scripts/setup-token-refresh.js
```

