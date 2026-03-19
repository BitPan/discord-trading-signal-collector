/**
 * Discord User Token 自动刷新服务
 * 使用 Puppeteer 自动登录获取新 Token
 */

const puppeteer = require('puppeteer');
const logger = require('../../utils/logger');
const config = require('../../config');
const fs = require('fs');
const path = require('path');

class TokenAutoRefreshService {
  constructor() {
    this.browser = null;
    this.lastRefreshTime = null;
  }

  /**
   * 自动登录并获取新 Token
   */
  async getNewToken(email, password) {
    let browser = null;
    try {
      logger.info('Starting Discord token auto-refresh...', { email });

      // 启动浏览器
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', // 减少内存使用
        ],
      });

      const page = await browser.newPage();

      // 设置超时
      page.setDefaultTimeout(30000);
      page.setDefaultNavigationTimeout(30000);

      logger.info('Opening Discord login page...');

      // 访问 Discord 登录页面
      await page.goto('https://discord.com/login', {
        waitUntil: 'networkidle2',
      });

      // 等待登录表单加载
      await page.waitForSelector('input[name="email"]', { timeout: 10000 });

      logger.info('Entering credentials...');

      // 输入邮箱
      await page.type('input[name="email"]', email, { delay: 50 });

      // 输入密码
      await page.type('input[name="password"]', password, { delay: 50 });

      // 点击登录按钮
      await page.click('button[type="submit"]');

      // 等待登录完成（可能需要检查 2FA）
      logger.info('Waiting for login to complete...');

      // 等待重定向到主页或 2FA 页面
      try {
        await page.waitForNavigation({
          waitUntil: 'networkidle2',
          timeout: 15000,
        });
      } catch (error) {
        // 有时候不会有导航事件，继续处理
        logger.warn('Navigation timeout (可能需要 2FA)', { error: error.message });
      }

      // 检查是否需要 2FA
      const twoFARequired = await page
        .$(
          'input[placeholder*="code"],' +
          'input[aria-label*="code"],' +
          'input[aria-label*="two-factor"]'
        )
        .then((element) => element !== null);

      if (twoFARequired) {
        logger.warn('⚠️ Two-Factor Authentication required!');
        logger.warn('请手动完成 2FA 认证，然后重新运行此脚本');

        // 等待用户完成 2FA（超时 5 分钟）
        try {
          await page.waitForNavigation({
            waitUntil: 'networkidle2',
            timeout: 5 * 60 * 1000,
          });
          logger.info('2FA completed by user');
        } catch (error) {
          throw new Error(
            '2FA 认证超时。请手动登录后再尝试自动刷新。'
          );
        }
      }

      // 等待页面完全加载
      await page.waitForTimeout(2000);

      logger.info('Extracting token from localStorage...');

      // 从 localStorage 获取 token
      const token = await page.evaluate(() => {
        try {
          const tokenData = localStorage.getItem('token');
          if (!tokenData) {
            throw new Error('Token not found in localStorage');
          }
          // Token 存储为 JSON 字符串（带引号）
          return JSON.parse(tokenData);
        } catch (error) {
          console.error('Error extracting token:', error);
          throw error;
        }
      });

      if (!token || typeof token !== 'string') {
        throw new Error('Invalid token format');
      }

      logger.info('✅ Token extracted successfully', {
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 10) + '...',
      });

      return token;
    } catch (error) {
      logger.error('Failed to get new token', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * 更新配置文件中的 Token
   */
  updateConfigFile(token) {
    try {
      const envPath = path.join(process.cwd(), '.env');

      if (!fs.existsSync(envPath)) {
        logger.warn('.env file not found, creating one');
        fs.writeFileSync(envPath, `DISCORD_USER_TOKEN=${token}\n`);
        return;
      }

      // 读取现有 .env
      let envContent = fs.readFileSync(envPath, 'utf-8');

      // 如果存在 DISCORD_USER_TOKEN，替换它
      if (envContent.includes('DISCORD_USER_TOKEN')) {
        envContent = envContent.replace(
          /DISCORD_USER_TOKEN=.*/,
          `DISCORD_USER_TOKEN=${token}`
        );
      } else {
        // 否则追加
        envContent += `\nDISCORD_USER_TOKEN=${token}\n`;
      }

      fs.writeFileSync(envPath, envContent);
      logger.info('✅ .env file updated with new token');
    } catch (error) {
      logger.error('Failed to update .env file', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 验证 token 是否有效
   */
  async validateToken(token) {
    try {
      const response = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
          Authorization: token,
        },
      });

      if (response.ok) {
        const user = await response.json();
        logger.info('✅ Token is valid', {
          username: user.username,
          id: user.id,
        });
        return true;
      } else {
        logger.error('Token validation failed', {
          status: response.status,
          statusText: response.statusText,
        });
        return false;
      }
    } catch (error) {
      logger.error('Token validation error', { error: error.message });
      return false;
    }
  }

  /**
   * 启动自动刷新服务
   */
  async startAutoRefresh(email, password, intervalDays = 7) {
    logger.info('Starting auto-refresh service', {
      intervalDays,
      nextRefreshIn: `${intervalDays} days`,
    });

    // 立即执行一次
    try {
      const token = await this.getNewToken(email, password);

      // 验证 token
      const isValid = await this.validateToken(token);

      if (!isValid) {
        throw new Error('Token validation failed after refresh');
      }

      // 更新配置
      this.updateConfigFile(token);
      this.lastRefreshTime = new Date();

      logger.info('✅ Token refreshed successfully', {
        timestamp: this.lastRefreshTime,
      });

      return token;
    } catch (error) {
      logger.error('Initial token refresh failed', {
        error: error.message,
      });
      throw error;
    }

    // 定期刷新
    const interval = intervalDays * 24 * 60 * 60 * 1000;

    setInterval(async () => {
      try {
        logger.info('Running scheduled token refresh...');

        const newToken = await this.getNewToken(email, password);

        // 验证 token
        const isValid = await this.validateToken(newToken);

        if (!isValid) {
          throw new Error('Token validation failed');
        }

        // 更新配置
        this.updateConfigFile(newToken);
        this.lastRefreshTime = new Date();

        logger.info('✅ Token auto-refreshed successfully', {
          timestamp: this.lastRefreshTime,
          nextRefreshIn: `${intervalDays} days`,
        });

        // 发送 Telegram 通知
        const telegramService = require('../telegram/telegramService');
        await telegramService.notify(
          '✅ Discord Token 自动刷新成功',
          `Token 已更新\n` +
            `时间：${this.lastRefreshTime.toLocaleString()}\n` +
            `下次刷新：${new Date(Date.now() + interval).toLocaleString()}`
        );
      } catch (error) {
        logger.error('Scheduled token refresh failed', {
          error: error.message,
        });

        // 发送告警
        const telegramService = require('../telegram/telegramService');
        await telegramService.notify(
          '🚨 Discord Token 自动刷新失败',
          `错误：${error.message}\n` +
            `需要手动刷新 token\n` +
            `请查看日志了解详情`
        );
      }
    }, interval);
  }
}

module.exports = new TokenAutoRefreshService();
