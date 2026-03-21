#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function getTokenFromLogin(email, password) {
  let browser = null;
  let token = null;
  let allResponses = [];

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

    // 捕获所有响应
    page.on('response', async (response) => {
      const url = response.url();
      const status = response.status();
      
      // 记录所有 /api/ 相关的响应
      if (url.includes('/api/v')) {
        console.log(`📡 ${status} ${url.split('/api/')[1]}`);
        allResponses.push({ url, status });
        
        // 特别关注登录和认证端点
        if (url.includes('auth') || url.includes('login')) {
          try {
            const contentType = response.headers()['content-type'];
            if (contentType && contentType.includes('application/json')) {
              const data = await response.json();
              
              console.log('   响应数据:', JSON.stringify(data).substring(0, 100) + '...');
              
              // 查找 token
              if (data.token) {
                token = data.token;
                console.log('   ✅ 找到 token 字段！');
              }
              
              // 查找其他可能的字段
              if (data.user_token) {
                token = data.user_token;
                console.log('   ✅ 找到 user_token 字段！');
              }
              
              if (data.access_token) {
                token = data.access_token;
                console.log('   ✅ 找到 access_token 字段！');
              }
            }
          } catch (e) {
            console.log('   ⚠️  无法解析响应:', e.message);
          }
        }
      }
    });

    console.log('📱 访问 Discord 登录...');
    await page.goto('https://discord.com/login', { waitUntil: 'networkidle2' });

    console.log('📝 填写登录表单...');
    await page.waitForSelector('input[name="email"]', { timeout: 15000 });
    await page.type('input[name="email"]', email, { delay: 50 });
    await page.type('input[name="password"]', password, { delay: 50 });

    console.log('🔐 点击登录...');
    await page.click('button[type="submit"]');

    console.log('⏳ 等待登录响应...');
    
    // 等待足够长的时间让所有请求完成
    let waited = 0;
    while (waited < 45) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      waited++;
      process.stdout.write('.');
      
      if (token) {
        console.log('');
        return token;
      }
    }

    console.log('');
    
    if (token) {
      return token;
    }

    // 如果还没获取到 token，可能遇到了 2FA
    console.log('');
    console.log('⚠️  如果你的账户启用了 2FA，脚本可能无法自动完成认证');
    console.log('');
    console.log('【捕获到的响应】:');
    allResponses.forEach(r => {
      console.log(`  ${r.status} ${r.url.split('discord.com')[1]}`);
    });

    throw new Error('无法获取 token，可能是 2FA 认证问题');

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
    console.error('用法: node get-token-debug.js <email> <password>');
    process.exit(1);
  }

  try {
    console.log('═══════════════════════════════════════');
    console.log('  Discord Token 获取（调试模式）');
    console.log('═══════════════════════════════════════');
    console.log('');

    const token = await getTokenFromLogin(email, password);

    if (!token) {
      throw new Error('获取 token 失败');
    }

    console.log('✅ Token 获取成功！');
    console.log('');
    console.log('更新 .env...');

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
    console.log('🚀 重启应用: npm start');
    console.log('');
    process.exit(0);

  } catch (error) {
    console.error('❌ 失败:', error.message);
    process.exit(1);
  }
}

main();
