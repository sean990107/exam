import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

// 导入路由
import questionRoutes from './routes/questions';
import examRoutes from './routes/exams';
import userRoutes from './routes/users';

// 创建数据目录（如果不存在）
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const app = express();
const PORT = 8000;

// CORS配置
const corsOptions = {
  origin: function (origin: any, callback: any) {
    // 允许所有来源的请求
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// 中间件
app.use(cors(corsOptions));
app.use(express.json());

// 路由
app.use('/api/questions', questionRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/users', userRoutes);

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: '服务器内部错误' });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
}); 