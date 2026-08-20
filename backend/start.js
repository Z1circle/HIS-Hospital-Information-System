#!/usr/bin/env node

/**
 * HIS系统单一后端启动脚本
 * 确保后端在4000端口运行，与前端代理配置一致
 */

const { spawn } = require('child_process');
const path = require('path');

// 设置环境变量
process.env.PORT = '4000';
process.env.DB_USER = 'postgres';
process.env.DB_HOST = 'localhost';
process.env.DB_NAME = 'hisdb';
process.env.DB_PASSWORD = '1234';
process.env.DB_PORT = '5432';
process.env.DB_MAX_CONNECTIONS = '20';

console.log('=== HIS后端服务启动 ===');
console.log('配置信息:');
console.log('  端口:', process.env.PORT);
console.log('  数据库:', process.env.DB_NAME);
console.log('  数据库用户:', process.env.DB_USER);
console.log('');

// 启动服务器
const serverPath = path.join(__dirname, 'server.js');
const server = spawn('node', [serverPath], {
  env: { ...process.env },
  stdio: 'inherit'
});

server.on('error', (err) => {
  console.error('启动失败:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0) {
    console.error(`进程退出，代码: ${code}`);
    process.exit(code);
  }
});

// 处理终止信号
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  server.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n正在关闭服务器...');
  server.kill('SIGTERM');
  process.exit(0);
});

console.log('服务器启动中...');
console.log(`访问地址: http://localhost:${process.env.PORT}`);
console.log('');
console.log('按 Ctrl+C 停止服务器');