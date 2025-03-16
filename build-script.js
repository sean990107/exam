const fs = require('fs');
const path = require('path');

// 创建目标目录
const publicDir = path.join(__dirname, 'server', 'dist', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log(`✅ 创建目录: ${publicDir}`);
}

// 复制客户端构建文件到服务器目录
const sourceDir = path.join(__dirname, 'client', 'build');
if (!fs.existsSync(sourceDir)) {
  console.error(`❌ 源目录不存在: ${sourceDir}`);
  process.exit(1);
}

// 复制文件函数
function copyRecursive(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(function(childItemName) {
      copyRecursive(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

try {
  copyRecursive(sourceDir, publicDir);
  console.log(`✅ 成功复制文件从 ${sourceDir} 到 ${publicDir}`);
} catch (err) {
  console.error(`❌ 复制文件失败: ${err.message}`);
  process.exit(1);
} 