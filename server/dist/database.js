"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
// 加载环境变量
dotenv_1.default.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/examSystem';
// 连接到MongoDB
const connectDB = async () => {
    try {
        const conn = await mongoose_1.default.connect(MONGODB_URI);
        console.log(`MongoDB连接成功: ${conn.connection.host}`);
        return conn;
    }
    catch (error) {
        console.error(`MongoDB连接失败: ${error}`);
        process.exit(1);
    }
};
exports.default = connectDB;
