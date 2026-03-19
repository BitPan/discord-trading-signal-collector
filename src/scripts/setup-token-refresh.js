#!/usr/bin/env node

/**
 * 设置 Discord Token 自动刷新
 * 
 * 使用方式：
 * node src/scripts/setup-token-refresh.js <email> <password>
 * 
 * 例如：
 * node src/scripts/setup-token-refresh.js user@example.com mypassword123
 */

const readline = require('readline');
const path = require('path');
const fs = require('fs');
const tokenAutoRefresh = require('../modules/discord/tokenAutoRefresh');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Discord Token 自动刷新设置           ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');

  // 获取邮箱和密码
  let email = process.argv[2];
  let password = process.argv[3];

  if (!email) {
    email = await new Promise((resolve) => {
      rl.question('请输入 Discord 账户邮箱: ', resolve);
    });
  }

  if (!password) {
    // 隐藏密码输入
    process.stdout.write('请输入 Discord 账户密码: ');
    password = await new Promise((resolve) => {
      rl.once('line', resolve);
    });
  }

  try {
    console.log('');
    console.log('正在尝试登录并获取 Token...');
    console.log('（如果需要 2FA，请在浏览器中完成认证）');
    console.log('');

    // 获取新 token
    const token = await tokenAutoRefresh.getNewToken(email, password);

    console.log('✅ Token 获取成功！');
    console.log('正在验证 Token...');

    // 验证 token
    const isValid = await tokenAutoRefresh.validateToken(token);

    if (!isValid) {
      console.error('❌ Token 验证失败');
      process.exit(1);
    }

    console.log('✅ Token 验证成功！');
    console.log('正在更新配置...');

    // 更新 .env
    tokenAutoRefresh.updateConfigFile(token);

    console.log('✅ 配置已更新');
    console.log('');
    console.log('【设置完成】');
    console.log('系统将每 7 天自动刷新一次 Token');
    console.log('如果刷新失败，会通过 Telegram 发送告警');
    console.log('');
    console.log('现在需要重启应用以生效：');
    console.log('npm start');
    console.log('');

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 设置失败:', error.message);
    console.log('');
    console.log('【故障排查】');
    console.log('1. 检查邮箱和密码是否正确');
    console.log('2. 如果启用了 2FA，请在浏览器中完成认证');
    console.log('3. 检查网络连接');
    console.log('4. 查看日志了解详细错误信息');
    console.log('');

    rl.close();
    process.exit(1);
  }
}

main();
