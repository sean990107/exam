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
const app = (0, express_1.default)();
const port = 8080;
// 创建上传目录和数据目录
const uploadDir = path_1.default.join(__dirname, '../uploads');
const dataDir = path_1.default.join(__dirname, '../data');
const questionsFile = path_1.default.join(dataDir, 'questions.json');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
// 从文件加载题目
let questions = [];
try {
    if (fs_1.default.existsSync(questionsFile)) {
        const data = fs_1.default.readFileSync(questionsFile, 'utf8');
        questions = JSON.parse(data);
    }
}
catch (error) {
    console.error('加载题目失败:', error);
}
// 保存题目到文件
function saveQuestions() {
    try {
        fs_1.default.writeFileSync(questionsFile, JSON.stringify(questions, null, 2), 'utf8');
    }
    catch (error) {
        console.error('保存题目失败:', error);
    }
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
// 配置multer存储
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
// 配置multer，不使用文件过滤器
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 限制文件大小为10MB
    }
});
// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    if (err instanceof multer_1.default.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: '文件大小不能超过10MB' });
        }
        return res.status(400).json({ success: false, message: '文件上传失败：' + err.message });
    }
    res.status(500).json({ success: false, message: err.message || '服务器错误，请稍后重试' });
});
const users = [
    {
        id: 1,
        name: 'xyfgs',
        department: '管理部门',
        password: 'admin123',
        role: 'admin'
    }
];
// 登录路由
app.post('/api/users/login', (req, res) => {
    try {
        const { name, department, password } = req.body;
        console.log('Login attempt:', { name, department, password });
        // 管理员登录
        if (name === 'xyfgs') {
            if (password !== 'admin123') {
                res.status(401).json({
                    success: false,
                    message: '管理员密码错误'
                });
                return;
            }
            const user = users.find(u => u.name === name);
            if (user) {
                const { password: _, ...userWithoutPassword } = user;
                res.json({
                    success: true,
                    user: userWithoutPassword
                });
                return;
            }
        }
        // 普通用户登录
        if (name && department) {
            const user = {
                id: Date.now(),
                name,
                department,
                role: 'user'
            };
            res.json({
                success: true,
                user
            });
            return;
        }
        res.status(401).json({
            success: false,
            message: '登录失败，请检查输入信息'
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误，请稍后重试'
        });
    }
});
// 获取题目列表
app.get('/api/questions', (req, res) => {
    try {
        // 随机打乱题目顺序
        const shuffledQuestions = [...questions]
            .sort(() => Math.random() - 0.5)
            .map(({ correctAnswer, ...question }) => ({
            ...question,
            type: correctAnswer.length > 1 ? 'multiple' : 'single'
        }));
        res.json({
            success: true,
            questions: shuffledQuestions
        });
    }
    catch (error) {
        console.error('Get questions error:', error);
        res.status(500).json({
            success: false,
            message: '获取题目失败'
        });
    }
});
// 管理员获取完整题目列表（包含答案）
app.get('/api/admin/questions', (req, res) => {
    try {
        res.json({
            success: true,
            questions: questions
        });
    }
    catch (error) {
        console.error('Get admin questions error:', error);
        res.status(500).json({
            success: false,
            message: '获取题目失败'
        });
    }
});
// 提交答案
app.post('/api/submit', (req, res) => {
    try {
        const { answers, userId } = req.body;
        const score = calculateScore(answers);
        res.json({
            success: true,
            score,
            total: questions.length
        });
    }
    catch (error) {
        console.error('Submit answers error:', error);
        res.status(500).json({
            success: false,
            message: '提交答案失败'
        });
    }
});
// 计算分数
function calculateScore(answers) {
    let score = 0;
    for (const question of questions) {
        if (answers[question.id] === question.correctAnswer) {
            score++;
        }
    }
    return score;
}
// 导入Excel题库
app.post('/api/questions/import', upload.single('file'), (req, res) => {
    console.log('Import request received');
    try {
        // 检查是否有文件上传
        if (!req.file) {
            console.log('No file uploaded');
            return res.status(400).json({
                success: false,
                message: '没有上传文件'
            });
        }
        console.log('Uploaded file:', req.file);
        // 检查文件扩展名
        const fileExt = path_1.default.extname(req.file.originalname).toLowerCase();
        if (fileExt !== '.xlsx' && fileExt !== '.xls') {
            console.log('Invalid file extension:', fileExt);
            // 删除不符合要求的文件
            fs_1.default.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: '只支持Excel文件格式(.xlsx或.xls)'
            });
        }
        // 读取Excel文件
        try {
            console.log('Reading Excel file:', req.file.path);
            const workbook = XLSX.readFile(req.file.path);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            // 转换为数组，每行一条记录
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
            console.log('Excel rows count:', rows.length);
            // 过滤掉空行和标题行
            const validRows = rows.filter(row => {
                // 检查行是否有足够的列
                if (row.length < 6)
                    return false;
                // 检查第一列是否为空
                if (!row[0] || row[0].trim() === '')
                    return false;
                // 检查是否是标题行（通常标题行没有选项）
                if (!row[1] || !row[2])
                    return false;
                return true;
            });
            console.log('Valid rows count:', validRows.length);
            if (validRows.length === 0) {
                console.log('No valid questions found in Excel');
                fs_1.default.unlinkSync(req.file.path);
                return res.status(400).json({
                    success: false,
                    message: 'Excel文件中没有找到有效的题目数据'
                });
            }
            // 处理Excel数据
            const importedQuestions = validRows.map((row, index) => {
                const [question, optionA, optionB, optionC, optionD, answer] = row;
                // 收集有效的选项
                const options = [];
                if (optionA && optionA.trim() !== '')
                    options.push(optionA.trim());
                if (optionB && optionB.trim() !== '')
                    options.push(optionB.trim());
                if (optionC && optionC.trim() !== '')
                    options.push(optionC.trim());
                if (optionD && optionD.trim() !== '')
                    options.push(optionD.trim());
                // 验证答案格式
                const validAnswer = answer ? answer.trim().toUpperCase() : '';
                return {
                    id: Date.now() + index, // 使用时间戳+索引作为ID，确保唯一性
                    question: question.trim(),
                    options,
                    correctAnswer: validAnswer,
                    type: validAnswer.length > 1 ? 'multiple' : 'single'
                };
            });
            console.log('Imported questions count:', importedQuestions.length);
            // 根据上传模式处理题目
            const uploadMode = req.body.mode || 'append';
            console.log('Upload mode:', uploadMode);
            if (uploadMode === 'overwrite') {
                questions = importedQuestions;
            }
            else {
                questions.push(...importedQuestions);
            }
            // 保存题目到文件
            saveQuestions();
            console.log('Questions saved to file');
            // 删除临时文件
            fs_1.default.unlinkSync(req.file.path);
            console.log('Temporary file deleted');
            return res.json({
                success: true,
                message: '题库导入成功',
                count: importedQuestions.length,
                total: questions.length
            });
        }
        catch (error) {
            console.error('Error processing Excel file:', error);
            // 删除临时文件
            if (req.file && fs_1.default.existsSync(req.file.path)) {
                fs_1.default.unlinkSync(req.file.path);
            }
            return res.status(500).json({
                success: false,
                message: '处理Excel文件失败：' + error.message
            });
        }
    }
    catch (error) {
        console.error('Import questions error:', error);
        if (req.file && fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        return res.status(500).json({
            success: false,
            message: '导入题库失败：' + error.message
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
// 获取考试设置
app.get('/api/users/settings', (req, res) => {
    try {
        // 返回默认设置
        res.json({
            success: true,
            questionCount: 0, // 0表示全部题目
            lastUpdated: Date.now()
        });
    }
    catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({
            success: false,
            message: '获取设置失败'
        });
    }
});
// 更新考试设置
app.post('/api/users/settings', (req, res) => {
    try {
        const { questionCount } = req.body;
        res.json({
            success: true,
            settings: {
                questionCount,
                lastUpdated: Date.now()
            }
        });
    }
    catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({
            success: false,
            message: '更新设置失败'
        });
    }
});
// 获取考试结果
app.get('/api/exams', (req, res) => {
    try {
        // 确保从文件中重新加载最新的考试结果
        try {
            if (fs_1.default.existsSync(examResultsFile)) {
                const data = fs_1.default.readFileSync(examResultsFile, 'utf8');
                examResults = JSON.parse(data);
            }
        }
        catch (loadError) {
            console.error('重新加载考试结果失败:', loadError);
        }
        console.log(`返回考试结果: ${examResults.length}条记录`);
        res.json(examResults);
    }
    catch (error) {
        console.error('Get exam results error:', error);
        res.status(500).json({
            success: false,
            message: '获取考试结果失败'
        });
    }
});
// 获取随机题目
app.get('/api/questions/random/:count', (req, res) => {
    try {
        const count = parseInt(req.params.count);
        const shuffledQuestions = [...questions]
            .sort(() => Math.random() - 0.5)
            .slice(0, count)
            .map(({ correctAnswer, ...question }) => ({
            ...question,
            type: correctAnswer.length > 1 ? 'multiple' : 'single'
        }));
        res.json({
            success: true,
            questions: shuffledQuestions
        });
    }
    catch (error) {
        console.error('Get random questions error:', error);
        res.status(500).json({
            success: false,
            message: '获取题目失败'
        });
    }
});
// 提交考试
app.post('/api/exams', (req, res) => {
    try {
        const { userId, userName, department, questions: submittedQuestions, answers } = req.body;
        // 计算得分 - 修改为百分制
        let correctAnswers = 0;
        submittedQuestions.forEach((question) => {
            const originalQuestion = questions.find((q) => q.id === question.id);
            if (originalQuestion && answers[question.id] === originalQuestion.correctAnswer) {
                correctAnswers++;
            }
        });
        // 计算百分制分数，每道题分数相同
        const totalQuestions = submittedQuestions.length;
        const scorePerQuestion = totalQuestions > 0 ? 100 / totalQuestions : 0;
        const score = Math.round(correctAnswers * scorePerQuestion);
        const examResult = {
            id: Date.now().toString(),
            userId,
            userName,
            department,
            score,
            totalQuestions,
            correctAnswers,
            timestamp: Date.now(),
            questions: submittedQuestions.map((question) => {
                const originalQuestion = questions.find(q => q.id === question.id);
                return {
                    ...question,
                    userAnswer: answers[question.id] || '',
                    answer: (originalQuestion === null || originalQuestion === void 0 ? void 0 : originalQuestion.correctAnswer) || '',
                    isCorrect: answers[question.id] === (originalQuestion === null || originalQuestion === void 0 ? void 0 : originalQuestion.correctAnswer)
                };
            })
        };
        // 保存考试结果到文件
        saveExamResult(examResult);
        // 返回考试结果
        res.json({
            success: true,
            score,
            totalQuestions,
            correctAnswers,
            examId: examResult.id,
            examResult
        });
    }
    catch (error) {
        console.error('Submit exam error:', error);
        res.status(500).json({
            success: false,
            message: '提交考试失败'
        });
    }
});
// 保存考试结果到文件
const examResultsFile = path_1.default.join(dataDir, 'examResults.json');
let examResults = [];
// 加载考试结果
try {
    if (fs_1.default.existsSync(examResultsFile)) {
        const data = fs_1.default.readFileSync(examResultsFile, 'utf8');
        examResults = JSON.parse(data);
        console.log(`加载考试结果: ${examResults.length}条记录`);
    }
    else {
        console.log('考试结果文件不存在，将创建新文件');
        fs_1.default.writeFileSync(examResultsFile, JSON.stringify([], null, 2), 'utf8');
    }
}
catch (error) {
    console.error('加载考试结果失败:', error);
}
// 保存考试结果
function saveExamResult(examResult) {
    try {
        examResults.push(examResult);
        fs_1.default.writeFileSync(examResultsFile, JSON.stringify(examResults, null, 2), 'utf8');
        console.log(`保存考试结果成功，当前共有${examResults.length}条记录`);
    }
    catch (error) {
        console.error('保存考试结果失败:', error);
    }
}
// 启动服务器
app.listen(port, '0.0.0.0', () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});
