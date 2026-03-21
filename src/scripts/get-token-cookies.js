#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function getTokenViaCookies(email, password) {
  let browser = null;
  try {
    console.log('🚀 启动浏览器 (headless:false 以便看到 2FA)...');
    
    browser = await puppeteer.launch({
      headless: false, // 显示浏览器，方便处理 2FA
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(120000);

    console.log('📱 访问 Discord...');
    await page.goto('https://discord.com/login', { waitUntil: 'networkidle2' });

    console.log('📝 输入凭据...');
    await page.waitForSelector('input[name="email"]');
    await page.type('input[name="email"]', email, { delay: 30 });
    await page.type('input[name="password"]', password, { delay: 30 });
    
    console.log('🔐 点击登录...');
    await page.click('button[type="submit"]');

    console.log('⏳ 如果看到 2FA，请在浏览器中完成认证...');
    console.log('   完成后，脚本会自动继续');
    
    // 等待进入主页（监听导航）
    try {
      await page.waitForNavigation({ 
        waitUntil: 'networkidle2',
        timeout: 120000 
      });
    } catch (e) {
      console.log('导航超时，尝试直接提取...');
    }

    // 延长等待以确保 localStorage 初始化
    console.log('⏳ 等待页面完全加载 (10 秒)...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('🔍 从页面提取 token...');
    
    // 方法 1: 从 localStorage
    let token = await page.evaluate(() => {
      try {
        const data = localStorage.getItem('token');
        if (data) return JSON.parse(data);
      } catch (e) {}
      return null;
    });

    if (!token) {
      console.log('localStorage 方法失败，尝试 IndexedDB...');
      // 方法 2: 从 IndexedDB
      token = await page.evaluate(() => {
        return new Promise((resolve) => {
          const request = indexedDB.open('discordPreload');
          request.onsuccess = (event) => {
            try {
              const db = event.target.result;
              const transaction = db.transaction(['localSettings'], 'readonly');
              const store = transaction.objectStore('localSettings');
              const getRequest = store.get('token');
              getRequest.onsuccess = () => {
                resolve(getRequest.result?.value);
              };
              getRequest.onerror = () => resolve(null);
            } catch (e) {
              resolve(null);
            }
          };
          request.onerror = () => resolve(null);
        });
      });
    }

    if (!token) {
      console.log('尝试从 sessionStorage...');
      // 方法 3: sessionStorage
      token = await page.evaluate(() => {
        const data = sessionStorage.getItem('token');
        return data ? JSON.parse(data) : null;
      });
    }

    if (token && typeof token === 'string' && token.length > 50) {
      console.log('✅ Token 获取成功！');
      return token;
    }

    throw new Error('无法从页面中提取 token');

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
    console.error('使用方法: node get-token-cookies.js <email> <password>');
    process.exit(1);
  }

  try {
    console.log('═══════════════════════════════════════');
    console.log('  Discord Token 自动获取（支持 2FA）');
    console.log('═══════════════════════════════════════');
    console.log('');

    const token = await getTokenViaCookies(email, password);

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('✅ Token 获取成功！');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('Token 长度:', token.length);
    console.log('Token 前缀:', token.substring(0, 30) + '...');
    console.log('');
    console.log('📝 更新 .env 文件...');

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
    console.log('📋 配置内容:');
    console.log(envContent);
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
    console.log('2. 如果有 2FA，请在浏览器窗口中完成认证');
    console.log('3. 检查网络连接');
    process.exit(1);
  }
}

main();
