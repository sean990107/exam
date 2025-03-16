#!/bin/bash
set -e

echo "===== Railway 部署脚本 ====="

# 查看当前目录结构
echo "当前目录结构："
ls -la

# 检查client目录是否存在
if [ ! -d "./client" ]; then
  echo "错误：找不到client目录！"
  echo "当前目录内容："
  ls -la
  
  # 尝试查找client目录
  echo "尝试查找client目录："
  find . -name "client" -type d
  
  # 尝试查找package.json文件
  echo "尝试查找package.json文件："
  find . -name "package.json"
  
  exit 1
fi

# 检查server目录是否存在
if [ ! -d "./server" ]; then
  echo "错误：找不到server目录！"
  echo "当前目录内容："
  ls -la
  exit 1
fi

# 安装项目依赖
echo "安装根目录依赖..."
npm install

# 安装客户端依赖
echo "安装客户端依赖..."
cd client
echo "客户端目录内容："
ls -la
npm install
echo "构建客户端..."

# 确保CI=false，避免将警告视为错误
export CI=false
export NODE_OPTIONS=--max-old-space-size=1024
npx react-scripts build || npm run build
cd ..

# 安装服务器依赖
echo "安装服务器依赖..."
cd server
echo "服务器目录内容："
ls -la
npm install
echo "构建服务器..."
npm run build
cd ..

# 创建public目录
echo "创建public目录..."
mkdir -p server/dist/public

# 检查client/build目录是否存在
if [ ! -d "./client/build" ]; then
  echo "错误：找不到client/build目录！"
  echo "client目录内容："
  ls -la client
  exit 1
fi

# 复制客户端构建到服务器public目录
echo "复制客户端文件到服务器..."
cp -r client/build/* server/dist/public/

echo "===== 构建完成 =====" 