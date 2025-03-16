#!/bin/bash
set -e

echo "===== 开始构建 ====="

# 安装依赖
echo "安装项目依赖..."
npm install

# 安装客户端依赖
echo "安装客户端依赖..."
cd client
npm install --production=false
NODE_OPTIONS=--max-old-space-size=1024 npx react-scripts build
cd ..

# 安装服务器依赖
echo "安装服务器依赖..."
cd server
npm install --production=false
npm run build
cd ..

# 创建public目录
echo "创建public目录..."
mkdir -p server/dist/public

# 复制客户端构建到服务器public目录
echo "复制客户端文件到服务器..."
cp -r client/build/* server/dist/public/

echo "===== 构建完成 =====" 