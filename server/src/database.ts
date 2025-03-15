import mongoose from 'mongoose';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/examSystem';

// 连接到MongoDB
const connectDB = async () => {
  try {
    console.log('正在连接到MongoDB...');
    console.log('连接字符串:', MONGODB_URI.replace(/(mongodb\+srv:\/\/)([^:]+):([^@]+)@/, '$1****:****@'));
    const conn = await mongoose.connect(MONGODB_URI);
    console.log(`MongoDB连接成功: ${conn.connection.host}`);
    return conn;
  } catch (error: any) {
    console.error('MongoDB连接失败:');
    console.error('错误类型:', error.name);
    console.error('错误消息:', error.message);
    if (error.code) {
      console.error('错误代码:', error.code);
    }
    process.exit(1);
  }
};

export default connectDB; 