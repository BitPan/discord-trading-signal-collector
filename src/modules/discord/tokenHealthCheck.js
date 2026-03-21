/**
 * Discord Token 健康检查服务
 * 定期检查 Token 是否有效
 * Token 失效时发送 Telegram 告警
 */

const logger = require('../../utils/logger');
const telegramService = require('../telegram/telegramService');
const config = require('../../config');

class TokenHealthCheckService {
  constructor() {
    this.isHealthy = true;
    this.lastCheckTime = null;
    this.checkInterval = 30 * 60 * 1000; // 每 30 分钟检查一次
  }

  /**
   * 验证 token 是否有效
   */
  async validateToken(token) {
    try {
      const response = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
          Authorization: token,
          'User-Agent': 'Discord Trading Signal Collector',
        },
      });

      if (response.ok) {
        const user = await response.json();
        logger.info('✅ Discord Token 有效', {
          username: user.username,
          userId: user.id,
        });
        return { valid: true, user };
      } else if (response.status === 401) {
        logger.error('❌ Discord Token 无效或已过期', {
          status: response.status,
        });
        return { valid: false, reason: 'token_invalid' };
      } else {
        logger.warn('Discord API 响应异常', {
          status: response.status,
          statusText: response.statusText,
        });
        return { valid: false, reason: 'api_error' };
      }
    } catch (error) {
      logger.error('Token 验证错误', { error: error.message });
      return { valid: false, reason: 'network_error' };
    }
  }

  /**
   * 启动健康检查
   */
  async startHealthCheck() {
    logger.info('启动 Discord Token 健康检查', {
      interval: `${this.checkInterval / 1000 / 60} 分钟`,
    });

    // 立即执行一次
    await this.performHealthCheck();

    // 定期执行
    setInterval(() => this.performHealthCheck(), this.checkInterval);
  }

  /**
   * 执行一次健康检查
   */
  async performHealthCheck() {
    try {
      const token = config.discord.userToken;

      if (!token) {
        logger.warn('⚠️ DISCORD_USER_TOKEN 未配置');
        this.isHealthy = false;
        
        await this.alertTokenMissing();
        return;
      }

      const result = await this.validateToken(token);
      this.lastCheckTime = new Date();

      if (!result.valid) {
        this.isHealthy = false;

        logger.error('🚨 Discord Token 已失效！', {
          reason: result.reason,
        });

        // 发送告警
        await this.alertTokenInvalid(result.reason);
      } else {
        if (!this.isHealthy) {
          // Token 从失效恢复到有效
          logger.info('✅ Discord Token 已恢复！');
          this.isHealthy = true;
          
          await telegramService.notify(
            '✅ Discord Token 已自动恢复',
            `状态: 正常\n` +
            `用户: ${result.user.username}\n` +
            `时间: ${new Date().toLocaleString()}`
          );
        }
      }
    } catch (error) {
      logger.error('健康检查异常', { error: error.message });
    }
  }

  /**
   * Token 无效时的告警
   */
  async alertTokenInvalid(reason) {
    const reasonText = {
      token_invalid: 'Token 已失效或过期',
      api_error: 'Discord API 返回错误',
      network_error: '网络连接问题',
    }[reason] || 'Unknown error';

    try {
      await telegramService.notify(
        '🚨 Discord Token 已失效',
        `状态: ${reasonText}\n\n` +
        `需要更新 Token:\n\n` +
        `【快速更新（推荐）】\n` +
        `访问: http://localhost:3000/admin/token-update\n` +
        `在表单中粘贴新 token\n\n` +
        `【获取新 Token】\n` +
        `1. 打开 Discord 网页版\n` +
        `2. 按 F12 → Console\n` +
        `3. 运行: (function(){console.log(JSON.parse(localStorage.getItem('token')))})()\n` +
        `4. 复制输出的 token\n\n` +
        `时间: ${new Date().toLocaleString()}`
      );
    } catch (error) {
      logger.error('发送告警失败', { error: error.message });
    }
  }

  /**
   * Token 缺失时的告警
   */
  async alertTokenMissing() {
    try {
      await telegramService.notify(
        '⚠️ Discord Token 未配置',
        `应用无法连接到 Discord\n\n` +
        `需要配置 Token:\n\n` +
        `访问: http://localhost:3000/admin/token-update\n` +
        `在表单中粘贴 token`
      );
    } catch (error) {
      logger.error('发送缺失告警失败', { error: error.message });
    }
  }

  /**
   * 获取健康状态
   */
  getStatus() {
    return {
      healthy: this.isHealthy,
      lastCheck: this.lastCheckTime,
      nextCheck: new Date(
        Date.now() + this.checkInterval
      ).toLocaleString(),
    };
  }
}

module.exports = new TokenHealthCheckService();
