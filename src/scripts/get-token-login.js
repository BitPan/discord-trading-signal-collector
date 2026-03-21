#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function getTokenFromLogin(email, password) {
  let browser = null;
  let token = null;

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
    page.setDefaultTimeout(120000);

    // 监听所有响应
    await page.on('response', async (response) => {
      const url = response.url();
      
      // 监听登录相关的请求
      if (url.includes('/api/v') && url.includes('login')) {
        console.log('🔗 发现登录请求:', url);
        
        try {
          const data = await response.json();
          
          // 从响应体中查找 token
          if (data.token) {
            token = data.token;
            console.log('✅ 从登录响应找到 token！');
          }
          
          // 打印响应以便调试
          if (data.user) {
            console.log('👤 用户:', data.user.username || data.user.email);
          }
        } catch (e) {
          // 无法解析 JSON
        }
      }

      // 也检查其他可能返回 token 的端点
      if (url.includes('/api/v10/auth')) {
        console.log('🔗 发现认证请求:', url);
        
        try {
          const data = await response.json();
          if (data.token) {
            token = data.token;
            console.log('✅ 从认证响应找到 token！');
          }
        } catch (e) {}
      }
    });

    // 监听响应头中的 Authorization
    await page.on('response', async (response) => {
      const headers = response.headers();
      if (headers['authorization'] && !token) {
        token = headers['authorization'];
        console.log('✅ 从响应头找到 Authorization token！');
      }
    });

    console.log('📱 访问 Discord 登录...');
    await page.goto('https://discord.com/login', { waitUntil: 'networkidle2' });

    console.log('📝 等待并填写登录表单...');
    await page.waitForSelector('input[name="email"]', { timeout: 15000 });
    
    console.log('输入邮箱...');
    await page.type('input[name="email"]', email, { delay: 50 });
    
    console.log('输入密码...');
    await page.type('input[name="password"]', password, { delay: 50 });

    console.log('🔐 点击登录按钮...');
    
    // 等待登录按钮被点击并监听网络响应
    const clickPromise = page.click('button[type="submit"]');
    
    // 同时等待网络请求完成
    const loginPromise = page.waitForNavigation({ 
      waitUntil: 'networkidle2',
      timeout: 60000 
    }).catch(() => {
      console.log('⚠️  导航超时，但继续等待网络响应...');
      return null;
    });

    await clickPromise;
    await loginPromise;

    console.log('⏳ 等待登录响应（30 秒）...');
    
    // 等待 token
    let waited = 0;
    while (!token && waited < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      waited++;
      process.stdout.write('.');
    }

    if (token) {
      console.log('');
      console.log('✅ Token 获取成功！');
      return token;
    }

    throw new Error('无法从登录请求中提取 token');

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
    console.error('用法: node get-token-login.js <email> <password>');
    process.exit(1);
  }

  try {
    console.log('═══════════════════════════════════════');
    console.log('  Discord Token 获取');
    console.log('  从登录网络请求中提取');
    console.log('═══════════════════════════════════════');
    console.log('');

    const token = await getTokenFromLogin(email, password);

    if (!token) {
      throw new Error('获取 token 失败');
    }

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('✅ Token 获取成功！');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('Token 长度:', token.length);
    console.log('Token 前 40 字:', token.substring(0, 40) + '...');
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
    console.log('🚀 现在重启应用:');
    console.log('  npm start');
    console.log('');
    process.exit(0);

  } catch (error) {
    console.error('❌ 失败:', error.message);
    console.log('');
    console.log('【可能的原因】');
    console.log('1. 邮箱或密码错误');
    console.log('2. Discord 账户可能被锁定');
    console.log('3. 2FA 认证问题');
    console.log('4. 网络连接问题');
    console.log('');
    process.exit(1);
  }
}

main();
