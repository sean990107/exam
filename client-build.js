const { execSync } = require('child_process');
const path = require('path');

console.log('开始构建客户端应用...');

try {
  // 设置更大的内存限制并构建客户端
  execSync('cd client && cross-env NODE_OPTIONS=--max-old-space-size=1024 npm run build', {
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  console.log('✅ 客户端构建成功');
} catch (error) {
  console.error('❌ 客户端构建失败:', error.message);
  process.exit(1);
} 