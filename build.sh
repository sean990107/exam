#!/bin/bash
set -e

echo "安装依赖..."
npm install
cd client
npm install --production=false
cd ../server
npm install --production=false
cd ..

echo "构建客户端..."
cd client
npx react-scripts build
cd ..

echo "构建服务器..."
cd server
npx tsc
cd ..

echo "复制客户端文件到服务器..."
mkdir -p server/dist/public
cp -r client/build/* server/dist/public/ || true

echo "构建完成!" 