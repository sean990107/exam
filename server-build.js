const { execSync } = require('child_process');
const path = require('path');

console.log('开始构建服务器应用...');

try {
  // 构建服务器
  execSync('cd server && npm run build', {
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  console.log('✅ 服务器构建成功');
} catch (error) {
  console.error('❌ 服务器构建失败:', error.message);
  process.exit(1);
} 