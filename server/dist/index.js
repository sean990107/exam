"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const XLSX = __importStar(require("xlsx"));
const dotenv_1 = __importDefault(require("dotenv"));
// 导入数据库连接
const database_1 = __importDefault(require("./database"));
// 导入模型
const Question_1 = __importDefault(require("./models/Question"));
const User_1 = __importDefault(require("./models/User"));
const ExamResult_1 = __importDefault(require("./models/ExamResult"));
const Setting_1 = __importDefault(require("./models/Setting"));
// 加载环境变量
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT ? parseInt(process.env.PORT) : 49152;
// 创建上传目录
const uploadDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// 配置CORS
app.use((0, cors_1.default)({
    origin: '*', // 允许所有来源
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
// 配置中间件
app.use(body_parser_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
// 配置文件上传
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = (0, multer_1.default)({ storage: storage });
// 默认管理员
const defaultAdmin = {
    name: 'admin',
    department: '管理部门',
    password: 'admin123',
    isAdmin: true
};
// 默认部门
const departments = ['管理部门', '综合管理部', '项目拓展部', '运营管理部'];
// 初始化默认设置
const defaultSettings = {
    questionCount: 10,
    examDuration: 60,
    passingScore: 60,
    lastUpdated: Date.now()
};
// 数据库初始化
async function initializeDatabase() {
    try {
        // 检查并初始化管理员用户
        const adminExists = await User_1.default.findOne({ name: 'admin' });
        if (!adminExists) {
            await User_1.default.create(defaultAdmin);
            console.log('已创建默认管理员');
        }
        // 检查并初始化设置
        const settingsExist = await Setting_1.default.findOne({});
        if (!settingsExist) {
            await Setting_1.default.create(defaultSettings);
            console.log('已创建默认设置');
        }
        // 统计题目数量
        const questionCount = await Question_1.default.countDocuments();
        console.log(`数据库中共有${questionCount}道题目`);
        // 统计考试结果数量
        const resultCount = await ExamResult_1.default.countDocuments();
        console.log(`数据库中共有${resultCount}条考试记录`);
    }
    catch (error) {
        console.error('数据库初始化失败:', error);
    }
}
// 测试路由
app.get('/test', (req, res) => {
    console.log('收到测试请求');
    res.json({ message: 'API服务正常运行' });
});
// 用户登录
app.post('/api/login', async (req, res) => {
    try {
        const { name, department, password } = req.body;
        console.log('Login attempt:', req.body);
        // 检查是否是管理员登录
        if ((name === 'admin' || name === 'xyfgs') && password === 'admin123') {
            // 查找现有管理员或创建新管理员账号
            let adminUser = await User_1.default.findOne({ name });
            if (!adminUser) {
                adminUser = await User_1.default.create({
                    name,
                    department: '管理部门',
                    password: 'admin123',
                    isAdmin: true
                });
            }
            return res.json({
                success: true,
                isAdmin: true,
                user: {
                    id: adminUser._id,
                    name: adminUser.name,
                    department: adminUser.department,
                    isAdmin: true
                }
            });
        }
        // 普通用户登录检查
        const user = await User_1.default.findOne({ name, department });
        if (!user) {
            // 如果用户不存在且提供了有效信息，则创建新用户
            if (name && department && departments.includes(department)) {
                const newUser = await User_1.default.create({
                    name,
                    department,
                    password: password || 'password123', // 默认密码
                    isAdmin: false
                });
                return res.json({
                    success: true,
                    isAdmin: false,
                    user: {
                        id: newUser._id,
                        name: newUser.name,
                        department: newUser.department,
                        isAdmin: false
                    }
                });
            }
            return res.status(401).json({
                success: false,
                message: '用户名或部门错误'
            });
        }
        // 验证密码（如果提供了密码）
        if (password && user.password !== password) {
            return res.status(401).json({
                success: false,
                message: '密码错误'
            });
        }
        res.json({
            success: true,
            isAdmin: user.isAdmin,
            user: {
                id: user._id,
                name: user.name,
                department: user.department,
                isAdmin: user.isAdmin
            }
        });
    }
    catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({
            success: false,
            message: '登录失败，请稍后再试'
        });
    }
});
// 获取所有题目
app.get('/api/questions', async (req, res) => {
    try {
        const allQuestions = await Question_1.default.find({});
        res.json({
            success: true,
            questions: allQuestions
        });
    }
    catch (error) {
        console.error('获取题目错误:', error);
        res.status(500).json({
            success: false,
            message: '获取题目失败'
        });
    }
});
// 获取随机题目
app.get('/api/questions/random/:count', async (req, res) => {
    try {
        const count = parseInt(req.params.count);
        if (isNaN(count) || count <= 0) {
            return res.status(400).json({
                success: false,
                message: '题目数量必须是大于0的数字'
            });
        }
        // 获取所有题目，然后随机选择
        const allQuestions = await Question_1.default.find({});
        if (allQuestions.length === 0) {
            return res.status(404).json({
                success: false,
                message: '没有可用的题目'
            });
        }
        // 打乱题目顺序并返回指定数量
        const shuffledQuestions = allQuestions
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.min(count, allQuestions.length))
            .map(q => ({
            id: q._id,
            question: q.question,
            options: q.options,
            type: q.type
        }));
        res.json({
            success: true,
            questions: shuffledQuestions
        });
    }
    catch (error) {
        console.error('获取随机题目错误:', error);
        res.status(500).json({
            success: false,
            message: '获取随机题目失败'
        });
    }
});
// 提交考试结果
app.post('/api/exams', async (req, res) => {
    try {
        console.log('Submit exam request body:', req.body);
        const { userName, department, answers, usedTime, passingScore } = req.body;
        if (!answers || typeof answers !== 'object') {
            return res.status(400).json({
                success: false,
                message: '缺少有效的答案数据'
            });
        }
        // 获取所有问题ID
        const answerIds = Object.keys(answers || {});
        // 计算得分
        let correctAnswers = 0;
        let examQuestions = [];
        // 查找每个问题并检查答案
        for (const questionId of answerIds) {
            const question = await Question_1.default.findById(questionId);
            if (question) {
                examQuestions.push(question);
                if (answers[questionId] === question.correctAnswer) {
                    correctAnswers++;
                }
            }
        }
        // 计算百分制分数
        const totalQuestions = examQuestions.length;
        const scorePerQuestion = totalQuestions > 0 ? 100 / totalQuestions : 0;
        const score = Math.round(correctAnswers * scorePerQuestion);
        // 创建考试结果
        const examResult = await ExamResult_1.default.create({
            userName,
            department,
            score,
            totalQuestions,
            correctAnswers,
            timestamp: Date.now(),
            usedTime: usedTime || 0,
            questions: examQuestions.map(question => ({
                id: question._id.toString(),
                question: question.question,
                options: question.options,
                answer: question.correctAnswer,
                userAnswer: answers[question._id.toString()] || '',
                isCorrect: answers[question._id.toString()] === question.correctAnswer
            }))
        });
        res.json({
            success: true,
            score: score,
            examId: examResult._id
        });
    }
    catch (error) {
        console.error('提交考试错误:', error);
        res.status(500).json({
            success: false,
            message: '提交考试失败'
        });
    }
});
// 获取考试结果
app.get('/api/exams', async (req, res) => {
    try {
        const results = await ExamResult_1.default.find().sort({ timestamp: -1 });
        console.log(`返回考试结果: ${results.length}条记录`);
        res.json(results);
    }
    catch (error) {
        console.error('获取考试结果失败:', error);
        res.status(500).json({
            success: false,
            message: '获取考试结果失败'
        });
    }
});
// 删除考试结果
app.delete('/api/exams/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await ExamResult_1.default.findByIdAndDelete(id);
        const remainingResults = await ExamResult_1.default.countDocuments();
        console.log(`删除考试结果成功，当前共有${remainingResults}条记录`);
        res.json({
            success: true,
            message: '删除成功'
        });
    }
    catch (error) {
        console.error('删除考试结果失败:', error);
        res.status(500).json({
            success: false,
            message: '删除失败'
        });
    }
});
// 上传Excel题目
app.post('/api/questions/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '请上传文件'
            });
        }
        const filePath = req.file.path;
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        const newQuestions = [];
        const errors = [];
        // 处理每一行数据
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!row.question || !row.options || !row.answer) {
                errors.push(`第${i + 1}行: 缺少必要字段 (question, options, answer)`);
                continue;
            }
            try {
                // 解析选项
                let options;
                if (typeof row.options === 'string') {
                    options = row.options.split('|');
                }
                else if (Array.isArray(row.options)) {
                    options = row.options;
                }
                else {
                    errors.push(`第${i + 1}行: 选项格式不正确`);
                    continue;
                }
                // 处理题目类型
                const type = row.type && row.type.toLowerCase() === 'multiple' ? 'multiple' : 'single';
                // 创建新题目
                const newQuestion = await Question_1.default.create({
                    question: row.question,
                    options,
                    correctAnswer: row.answer,
                    type
                });
                newQuestions.push(newQuestion);
            }
            catch (error) {
                errors.push(`第${i + 1}行: ${error.message}`);
            }
        }
        // 清理上传的文件
        fs_1.default.unlinkSync(filePath);
        // 获取数据库中的总题目数
        const totalQuestions = await Question_1.default.countDocuments();
        res.json({
            success: true,
            message: `成功导入${newQuestions.length}道题目${errors.length > 0 ? '，但有' + errors.length + '个错误' : ''}`,
            count: newQuestions.length,
            total: totalQuestions,
            errors: errors.length > 0 ? errors : undefined
        });
    }
    catch (error) {
        console.error('导入题目失败:', error);
        res.status(500).json({
            success: false,
            message: '导入题目失败'
        });
    }
});
// 添加单个题目
app.post('/api/questions', async (req, res) => {
    try {
        const { question, options, correctAnswer, type } = req.body;
        if (!question || !options || !correctAnswer) {
            return res.status(400).json({
                success: false,
                message: '题目、选项和正确答案都是必填项'
            });
        }
        const newQuestion = await Question_1.default.create({
            question,
            options,
            correctAnswer,
            type: type || 'single'
        });
        res.json({
            success: true,
            message: '添加题目成功',
            question: newQuestion
        });
    }
    catch (error) {
        console.error('添加题目失败:', error);
        res.status(500).json({
            success: false,
            message: '添加题目失败'
        });
    }
});
// 删除题目
app.delete('/api/questions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Question_1.default.findByIdAndDelete(id);
        res.json({
            success: true,
            message: '删除题目成功'
        });
    }
    catch (error) {
        console.error('删除题目失败:', error);
        res.status(500).json({
            success: false,
            message: '删除题目失败'
        });
    }
});
// 获取考试设置
app.get('/api/users/settings', async (req, res) => {
    try {
        let settings = await Setting_1.default.findOne();
        if (!settings) {
            settings = await Setting_1.default.create(defaultSettings);
        }
        res.json({
            questionCount: settings.questionCount,
            examDuration: settings.examDuration,
            passingScore: settings.passingScore,
            lastUpdated: settings.lastUpdated
        });
    }
    catch (error) {
        console.error('获取设置失败:', error);
        res.status(500).json({
            success: false,
            message: '获取设置失败'
        });
    }
});
// 保存考试设置
app.post('/api/users/settings', async (req, res) => {
    try {
        const { questionCount, examDuration, passingScore } = req.body;
        // 查找或创建设置
        let settings = await Setting_1.default.findOne();
        if (!settings) {
            settings = new Setting_1.default();
        }
        // 更新设置
        settings.questionCount = questionCount || defaultSettings.questionCount;
        settings.examDuration = examDuration || defaultSettings.examDuration;
        settings.passingScore = passingScore || defaultSettings.passingScore;
        settings.lastUpdated = Date.now();
        await settings.save();
        console.log('保存设置成功');
        console.log('设置已更新:', settings);
        res.json(settings);
    }
    catch (error) {
        console.error('保存设置失败:', error);
        res.status(500).json({
            success: false,
            message: '保存设置失败'
        });
    }
});
// 根路由，用于测试连接
app.get('/', (req, res) => {
    res.json({ message: '考试系统后端服务正在运行' });
});
// 健康检查路由
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
// 启动服务器
const startServer = async () => {
    try {
        // 连接数据库
        await (0, database_1.default)();
        // 初始化数据库
        await initializeDatabase();
        // 启动服务器
        app.listen(port, () => {
            console.log('=================================');
            console.log('服务器启动成功！');
            console.log(`访问地址: http://localhost:${port}`);
            console.log(`测试地址: http://localhost:${port}/test`);
            console.log('=================================');
        });
    }
    catch (error) {
        console.error('启动服务器失败:', error);
        process.exit(1);
    }
};
// 添加进程异常处理
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
    process.exit(1);
});
process.on('unhandledRejection', (error) => {
    console.error('未处理的拒绝:', error);
    process.exit(1);
});
// 优雅关闭
process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 信号，正在关闭...');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('收到 SIGINT 信号，正在关闭...');
    process.exit(0);
});
startServer();
