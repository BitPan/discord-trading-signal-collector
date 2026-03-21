#!/usr/bin/env node

/**
 * 自动获取 Discord Token 脚本
 * 使用 Puppeteer 自动登录
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function getToken(email, password) {
  let browser = null;
  try {
    console.log('🚀 启动 Puppeteer 浏览器...');
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    console.log('📱 访问 Discord 登录页面...');
    await page.goto('https://discord.com/login', { waitUntil: 'networkidle2' });

    // 等待登录表单
    console.log('⏳ 等待登录表单...');
    await page.waitForSelector('input[name="email"]', { timeout: 30000 });

    console.log('📝 输入邮箱和密码...');
    await page.type('input[name="email"]', email, { delay: 30 });
    await page.type('input[name="password"]', password, { delay: 30 });

    // 找登录按钮
    const submitButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => 
        btn.textContent.includes('Log in') || 
        btn.textContent.includes('登') ||
        btn.type === 'submit'
      )?.outerHTML;
    });

    console.log('🔐 点击登录按钮...');
    await page.click('button[type="submit"]');

    // 等待登录完成 - 监听页面变化
    console.log('⏳ 等待登录完成（可能需要 2FA）...');
    
    let loginSuccess = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 秒超时

    while (attempts < maxAttempts && !loginSuccess) {
      try {
        // 尝试获取 token
        const token = await page.evaluate(() => {
          const tokenData = localStorage.getItem('token');
          return tokenData ? JSON.parse(tokenData) : null;
        });

        if (token && token.length > 50) {
          console.log('✅ Token 获取成功！');
          loginSuccess = true;
          return token;
        }
      } catch (e) {
        // localStorage 可能还未加载
      }

      // 检查是否在主页（登录成功）
      const url = page.url();
      if (url.includes('/channels/@me') || url.includes('/app')) {
        console.log('✅ 已进入 Discord 主页，获取 Token...');
        
        // 再次尝试获取 token
        const token = await page.evaluate(() => {
          const tokenData = localStorage.getItem('token');
          return tokenData ? JSON.parse(tokenData) : null;
        });

        if (token && token.length > 50) {
          return token;
        }
      }

      // 等待 1 秒后重试
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      process.stdout.write('.');
    }

    // 最后一次尝试
    console.log('');
    console.log('🔍 最终尝试获取 Token...');
    const finalToken = await page.evaluate(() => {
      const tokenData = localStorage.getItem('token');
      return tokenData ? JSON.parse(tokenData) : null;
    });

    if (finalToken && finalToken.length > 50) {
      return finalToken;
    }

    throw new Error('无法获取 Token。可能需要 2FA 认证或登录失败。');

  } catch (error) {
    console.error('❌ 错误:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('使用方法: node auto-get-token.js <email> <password>');
    process.exit(1);
  }

  try {
    console.log('═══════════════════════════════════════');
    console.log('  Discord Token 自动获取');
    console.log('═══════════════════════════════════════');
    console.log('');

    const token = await getToken(email, password);

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('✅ Token 获取成功！');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('Token (前 50 字):');
    console.log(token.substring(0, 50) + '...');
    console.log('');
    console.log('更新 .env 文件...');

    // 更新 .env
    const envPath = path.join(process.cwd(), '.env');
    let envContent = fs.readFileSync(envPath, 'utf-8');

    if (envContent.includes('DISCORD_USER_TOKEN=')) {
      envContent = envContent.replace(
        /DISCORD_USER_TOKEN=.*/,
        `DISCORD_USER_TOKEN=${token}`
      );
    } else {
      envContent += `\nDISCORD_USER_TOKEN=${token}\n`;
    }

    fs.writeFileSync(envPath, envContent);

    console.log('✅ .env 已更新');
    console.log('');
    console.log('现在需要重启应用:');
    console.log('  npm start');
    console.log('');
    process.exit(0);

  } catch (error) {
    console.error('❌ 失败:', error.message);
    console.log('');
    console.log('【故障排查】');
    console.log('1. 检查邮箱和密码是否正确');
    console.log('2. 检查网络连接');
    console.log('3. 账户可能已登出，尝试手动在浏览器中登录一次');
    console.log('');
    process.exit(1);
  }
}

main();
