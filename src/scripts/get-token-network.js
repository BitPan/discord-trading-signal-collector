#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function getTokenFromNetwork(email, password) {
  let browser = null;
  let extractedToken = null;

  try {
    console.log('🚀 启动 Puppeteer...');
    
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

    // 拦截网络请求，寻找登录响应
    await page.on('response', async (response) => {
      const url = response.url();
      
      // 监听登录相关的 API 调用
      if (url.includes('/api/') && response.status() === 200) {
        try {
          const contentType = response.headers()['content-type'];
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            
            // 寻找包含 token 的响应
            if (data.token) {
              extractedToken = data.token;
              console.log('✅ 从网络请求中找到 token！');
            }
          }
        } catch (e) {
          // 忽略 JSON 解析错误
        }
      }
    });

    console.log('📱 访问 Discord 登录...');
    await page.goto('https://discord.com/login', { waitUntil: 'networkidle2' });

    console.log('📝 输入凭据...');
    await page.waitForSelector('input[name="email"]', { timeout: 15000 });
    await page.type('input[name="email"]', email, { delay: 30 });
    await page.type('input[name="password"]', password, { delay: 30 });

    console.log('🔐 点击登录按钮...');
    await page.click('button[type="submit"]');

    console.log('⏳ 等待登录响应（30 秒）...');
    
    // 等待 token
    let waited = 0;
    while (!extractedToken && waited < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      waited++;
      process.stdout.write('.');
    }

    if (extractedToken) {
      console.log('');
      return extractedToken;
    }

    console.log('');
    console.log('⚠️ 网络方法未找到 token，尝试 localStorage...');

    // 最后尝试 localStorage（可能登录成功了）
    const tokenFromStorage = await page.evaluate(() => {
      try {
        const data = localStorage.getItem('token');
        return data ? JSON.parse(data) : null;
      } catch (e) {
        return null;
      }
    });

    if (tokenFromStorage && tokenFromStorage.length > 50) {
      return tokenFromStorage;
    }

    throw new Error('无法获取 token');

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
    console.error('用法: node get-token-network.js <email> <password>');
    process.exit(1);
  }

  try {
    console.log('═══════════════════════════════════════');
    console.log('  Discord Token 获取（网络拦截）');
    console.log('═══════════════════════════════════════');
    console.log('');

    const token = await getTokenFromNetwork(email, password);

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('✅ Token 获取成功！');
    console.log('═══════════════════════════════════════');
    console.log('');

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
    
    process.exit(0);

  } catch (error) {
    console.error('❌ 失败:', error.message);
    process.exit(1);
  }
}

main();
