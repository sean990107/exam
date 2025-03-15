import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// 导入数据库连接
import connectDB from './database';

// 导入模型
import Question from './models/Question';
import User from './models/User';
import ExamResult from './models/ExamResult';
import Setting from './models/Setting';
import SystemSetting from './models/SystemSetting';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/exam-system';

// 创建上传目录
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? '*' // 在生产环境中允许所有来源
    : 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 配置中间件
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// 接口类型定义
interface IQuestionType {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  type: 'single' | 'multiple';
}

// 默认管理员
const defaultAdmin = {
  name: 'admin',
  department: '管理部门',
  password: 'admin123',
  isAdmin: true
};

// 默认部门
const departments = [
  '综合管理部',
  '项目拓展部',
  '运营管理部'
];

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
    const adminExists = await User.findOne({ name: 'admin' });
    if (!adminExists) {
      await User.create(defaultAdmin);
      console.log('已创建默认管理员');
    }

    // 检查并初始化设置
    const settingsExist = await Setting.findOne({});
    if (!settingsExist) {
      await Setting.create(defaultSettings);
      console.log('已创建默认设置');
    }

    // 统计题目数量
    const questionCount = await Question.countDocuments();
    console.log(`数据库中共有${questionCount}道题目`);

    // 统计考试结果数量
    const resultCount = await ExamResult.countDocuments();
    console.log(`数据库中共有${resultCount}条考试记录`);

  } catch (error) {
    console.error('数据库初始化失败:', error);
  }
}

// 初始化系统设置
const initSystemSettings = async () => {
  try {
    // 检查答题模式设置是否存在
    const examModeSetting = await SystemSetting.findOne({ key: 'examMode' });
    if (!examModeSetting) {
      // 创建默认设置：允许重复答题
      await SystemSetting.create({
        key: 'examMode',
        value: 'unlimited', // unlimited=无限制模式, restricted=限制模式
        description: '答题模式设置：unlimited=无限制可重复答题，restricted=限制只能答题一次'
      });
      console.log('已创建默认答题模式设置: unlimited');
    }
  } catch (error) {
    console.error('初始化系统设置失败:', error);
  }
};

// 测试路由
app.get('/test', (req: Request, res: Response) => {
  console.log('收到测试请求');
  res.json({ message: 'API服务正常运行' });
});

// 用户登录
app.post('/api/login', async (req: Request, res: Response) => {
  try {
    const { name, department, password } = req.body;
    console.log('Login attempt:', req.body);
    
    // 检查是否是管理员登录
    if ((name === 'admin' || name === 'xyfgs') && password === 'admin123') {
      // 查找现有管理员或创建新管理员账号
      let adminUser = await User.findOne({ name });
      
      if (!adminUser) {
        adminUser = await User.create({
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
    const user = await User.findOne({ name, department });
    
    if (!user) {
      // 如果用户不存在且提供了有效信息，则创建新用户
      if (name && department && departments.includes(department)) {
        const newUser = await User.create({
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
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '登录失败，请稍后再试'
    });
  }
});

// 获取所有题目
app.get('/api/questions', async (req: Request, res: Response) => {
  try {
    const allQuestions = await Question.find({});
    console.log(`数据库中获取到 ${allQuestions.length} 道题目`);
    
    // 转换格式，确保可以被前端正确解析
    const formattedQuestions = allQuestions.map((q) => {
      const doc = q as any;
      return {
        id: doc._id.toString(),
        question: doc.question,
        options: doc.options,
        correctAnswer: doc.correctAnswer,
        type: doc.type
      };
    });
    
    console.log(`返回 ${formattedQuestions.length} 道题目`);
    
    // 修改返回格式，使用包含success和questions字段的对象
    res.json({
      success: true,
      questions: formattedQuestions,
      total: formattedQuestions.length
    });
  } catch (error) {
    console.error('获取题目错误:', error);
    res.status(500).json({
      success: false,
      message: '获取题目失败'
    });
  }
});

// 获取随机题目
app.get('/api/questions/random/:count', async (req: Request, res: Response) => {
  try {
    const count = parseInt(req.params.count);
    
    if (isNaN(count) || count <= 0) {
      return res.status(400).json({
        success: false,
        message: '题目数量必须是大于0的数字'
      });
    }
    
    // 获取所有题目，然后随机选择
    const allQuestions = await Question.find({});
    
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
  } catch (error) {
    console.error('获取随机题目错误:', error);
    res.status(500).json({
      success: false,
      message: '获取随机题目失败'
    });
  }
});

// 获取考试设置
app.get('/api/exam-settings', async (req: Request, res: Response) => {
  try {
    // 从数据库获取考试设置
    const settings = await Setting.findOne();
    
    const defaultSettings = {
      questionMode: 'custom', // 'all' 或 'custom'
      customQuestionCount: 10,
      examDuration: 30, // 分钟
      passingScore: 60
    };
    
    // 如果数据库中有设置，使用数据库设置；否则使用默认设置
    const formattedSettings = settings ? {
      questionMode: settings.questionMode || 'custom', // 使用数据库中的questionMode
      customQuestionCount: settings.questionCount || 10,
      examDuration: settings.examDuration || 30,
      passingScore: settings.passingScore || 60,
      lastUpdated: settings.lastUpdated || Date.now()
    } : defaultSettings;
    
    console.log('返回考试设置:', formattedSettings);
    res.json(formattedSettings);
  } catch (error) {
    console.error('获取考试设置错误:', error);
    res.status(500).json({
      success: false,
      message: '获取考试设置失败'
    });
  }
});

// 更新考试设置
app.post('/api/exam-settings', async (req: Request, res: Response) => {
  try {
    const settings = req.body;
    console.log('保存考试设置:', settings);
    
    // 确保必要字段都存在
    const validatedSettings = {
      questionCount: parseInt(settings.customQuestionCount) || 10,
      examDuration: parseInt(settings.examDuration) || 30,
      passingScore: parseInt(settings.passingScore) || 60,
      lastUpdated: Date.now(),
      questionMode: settings.questionMode || 'custom' // 添加questionMode字段
    };
    
    console.log('验证后的考试设置:', validatedSettings);
    
    // 删除旧数据并创建新数据，确保设置被完全替换
    await Setting.deleteMany({});
    const newSetting = await Setting.create(validatedSettings);
    
    console.log('考试设置已保存:', {
      questionMode: newSetting.questionMode,
      customQuestionCount: newSetting.questionCount,
      examDuration: newSetting.examDuration,
      passingScore: newSetting.passingScore,
      lastUpdated: newSetting.lastUpdated
    });
    
    res.json({
      success: true,
      message: '考试设置已更新',
      settings: {
        questionMode: newSetting.questionMode,
        customQuestionCount: newSetting.questionCount,
        examDuration: newSetting.examDuration,
        passingScore: newSetting.passingScore,
        lastUpdated: newSetting.lastUpdated
      }
    });
  } catch (error) {
    console.error('更新考试设置错误:', error);
    res.status(500).json({
      success: false,
      message: '更新考试设置失败'
    });
  }
});

// 提交考试结果
app.post('/api/exams/submit', async (req: Request, res: Response) => {
  try {
    const { userName, department, questions, usedTime, passingScore } = req.body;
    console.log('提交考试数据:', JSON.stringify(req.body, null, 2));
    
    // 查询答题模式设置
    const examModeSetting = await SystemSetting.findOne({ key: 'examMode' });
    const examMode = examModeSetting ? examModeSetting.value : 'unlimited';
    
    // 如果是无限制模式，先删除该用户之前的考试记录
    if (examMode === 'unlimited') {
      await ExamResult.deleteMany({ userName, department });
    }
    
    // 获取所有题目以便正确评分
    const allQuestions = await Question.find({});
    console.log(`成功获取题库数据，共${allQuestions.length}题`);
    
    // 创建题目ID映射，用于快速查找
    const questionsMap: Record<string, any> = {};
    
    // 记录所有题目ID到日志中以便调试
    console.log('题库中的ID列表:', allQuestions.map(q => {
      const doc = q as any;
      return doc._id ? doc._id.toString() : 'unknown';
    }));
    
    // 确保所有题目都被正确映射
    allQuestions.forEach(q => {
      const doc = q as any;
      if (doc._id) {
        const idStr = doc._id.toString();
        questionsMap[idStr] = {
          id: idStr,
          question: doc.question,
          options: doc.options,
          correctAnswer: doc.correctAnswer,
          type: doc.type
        };
      }
    });
    
    // 处理题目结果
    let correctAnswers = 0;
    const questionResults = [];
    
    if (questions && Array.isArray(questions) && questions.length > 0) {
      console.log(`开始处理 ${questions.length} 道题目的答案`);
      
      // 输出提交的题目ID列表，用于调试
      console.log('提交的题目ID列表:', questions.map(q => q.id));
      
      for (const q of questions) {
        try {
          // 基本数据验证
          if (!q || !q.question) {
            console.warn('跳过无效题目');
            continue;
          }
          
          // 从映射中找题目 - 确保不会访问undefined
          let questionId = '';
          if (q.id) {
            questionId = q.id.toString();
          } else {
            // 尝试获取_id，如果存在的话
            const qAny = q as any;
            if (qAny._id) {
              questionId = qAny._id.toString();
            }
          }
          
          // 调试日志
          console.log(`处理题目 ID: ${questionId}, 问题: "${q.question.substring(0, 30)}..."`);
          
          // 查找匹配的题目 - 即使没有通过ID匹配，也尝试通过问题内容匹配
          let fullQuestion = questionsMap[questionId];
          let correctAnswer = '';
          
          if (fullQuestion) {
            correctAnswer = fullQuestion.correctAnswer;
            console.log(`题目 ${questionId} 在题库中找到匹配，正确答案: ${correctAnswer}`);
          } else {
            // 尝试通过题目内容查找
            console.log('ID未匹配，尝试通过题目内容匹配');
            const matchingQuestion = allQuestions.find(dbQ => {
              const dbDoc = dbQ as any;
              return dbDoc.question === q.question || 
                     dbDoc.question.includes(q.question) || 
                     q.question.includes(dbDoc.question);
            });
            
            if (matchingQuestion) {
              const matchDoc = matchingQuestion as any;
              correctAnswer = matchDoc.correctAnswer;
              // 安全地获取_id
              if (matchDoc._id) {
                const matchId = matchDoc._id.toString();
                questionId = matchId;
                console.log(`通过内容匹配到题目，ID: ${questionId}, 正确答案: ${correctAnswer}`);
              }
            } else if (q.answer) {
              // 如果找不到匹配，但提交中包含答案，使用提交的答案
              correctAnswer = q.answer;
              console.log(`未找到匹配题目，使用提交的答案: ${correctAnswer}`);
            } else {
              console.warn(`无法为题目找到正确答案: "${q.question.substring(0, 30)}..."`);
              correctAnswer = '';
            }
          }
          
          // 确保答案数据存在
          const userAnswer = q.userAnswer || '';
          
          console.log(`处理题目: "${q.question.substring(0, 30)}...":`);
          console.log(`- 题目ID: ${questionId}`);
          console.log(`- 用户答案: ${userAnswer}`);
          console.log(`- 正确答案: ${correctAnswer}`);
          
          // 判断答案是否正确
          let isCorrect = false;
          if (q.type === 'multiple') {
            // 多选题比较
            const userAnswerArray = Array.from(userAnswer).sort();
            const correctAnswerArray = Array.from(correctAnswer).sort();
            isCorrect = JSON.stringify(userAnswerArray) === JSON.stringify(correctAnswerArray);
          } else {
            // 单选题比较
            isCorrect = userAnswer === correctAnswer;
          }
          
          if (isCorrect) {
            correctAnswers++;
            console.log('- 回答正确 ✓');
          } else {
            console.log('- 回答错误 ✗');
          }
          
          // 添加到结果列表
          questionResults.push({
            id: questionId || String(Date.now() + Math.random()),
            question: q.question,
            options: q.options || [],
            answer: correctAnswer,
            userAnswer: userAnswer,
            isCorrect
          });
        } catch (err) {
          console.error(`处理题目时发生错误:`, err);
        }
      }
    } else {
      console.warn('没有收到有效的题目数据');
    }
    
    // 计算分数
    const totalQuestions = questionResults.length;
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    
    console.log(`总题数: ${totalQuestions}, 正确数: ${correctAnswers}, 分数: ${score}`);
    
    // 创建考试结果记录
    const result = await ExamResult.create({
      userName,
      department,
      questions: questionResults,
      score,
      totalQuestions,
      correctAnswers,
      usedTime: usedTime || 0,
      timestamp: Date.now()
    });
    
    console.log('考试结果已保存:', {
      id: result._id,
      userName,
      score,
      totalQuestions,
      correctAnswers
    });
    
    res.json({
      success: true,
      score,
      totalQuestions,
      correctAnswers,
      isPassed: score >= (passingScore || 60)
    });
  } catch (error) {
    console.error('保存考试结果错误:', error);
    res.status(500).json({
      success: false,
      message: '保存考试结果失败'
    });
  }
});

// 获取考试结果
app.get('/api/exams', async (req: Request, res: Response) => {
  try {
    const results = await ExamResult.find().sort({ timestamp: -1 });
    console.log(`返回考试结果: ${results.length}条记录`);
    res.json(results);
  } catch (error) {
    console.error('获取考试结果失败:', error);
    res.status(500).json({
      success: false,
      message: '获取考试结果失败'
    });
  }
});

// 删除考试结果
app.delete('/api/exams/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await ExamResult.findByIdAndDelete(id);
    
    const remainingResults = await ExamResult.countDocuments();
    console.log(`删除考试结果成功，当前共有${remainingResults}条记录`);
    
    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除考试结果失败:', error);
    res.status(500).json({
      success: false,
      message: '删除失败'
    });
  }
});

// 上传Excel题目
app.post('/api/questions/upload', upload.single('file'), async (req: Request, res: Response) => {
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
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // 获取上传模式（追加或覆盖）
    const mode = req.body.mode || 'append';
    
    // 是否有表头，默认为false
    const hasHeader = req.body.hasHeader === 'true';
    
    // 如果是覆盖模式，先清空题库
    if (mode === 'overwrite') {
      await Question.deleteMany({});
    }

    const newQuestions = [];
    const errors = [];

    // 处理每一行数据，如果有表头则跳过第一行
    const startIndex = hasHeader ? 1 : 0;
    for (let i = startIndex; i < rawData.length; i++) {
      const row = rawData[i] as any[];
      
      // 检查行数据是否完整
      if (!row || row.length < 6 || !row[0]) {
        errors.push(`第${i + 1}行: 数据不完整，需要包含题干、选项A-D和正确答案`);
        continue;
      }

      try {
        // 获取题干
        const question = row[0];
        
        // 获取选项A-D，过滤掉undefined和null
        const options = [];
        for (let j = 1; j <= 4; j++) {
          if (row[j] !== undefined && row[j] !== null) {
            options.push(row[j].toString());
          }
        }
        
        // 获取正确答案
        const correctAnswer = row[5] ? row[5].toString() : '';
        
        // 检查选项和答案
        if (options.length < 2) {
          errors.push(`第${i + 1}行: 选项数量不足，至少需要2个选项`);
          continue;
        }
        
        if (!correctAnswer) {
          errors.push(`第${i + 1}行: 缺少正确答案`);
          continue;
        }
        
        // 判断题目类型：如果答案长度>1，则为多选题，否则为单选题
        const type = correctAnswer.length > 1 ? 'multiple' : 'single';

        // 创建新题目
        const newQuestion = await Question.create({
          question,
          options,
          correctAnswer,
          type
        });

        newQuestions.push(newQuestion);
      } catch (error: any) {
        errors.push(`第${i + 1}行: ${error.message}`);
      }
    }

    // 清理上传的文件
    fs.unlinkSync(filePath);

    // 获取数据库中的总题目数
    const totalQuestions = await Question.countDocuments();

    res.json({
      success: true,
      message: `成功导入${newQuestions.length}道题目${errors.length > 0 ? '，但有' + errors.length + '个错误' : ''}`,
      count: newQuestions.length,
      total: totalQuestions,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('导入题目失败:', error);
    res.status(500).json({
      success: false,
      message: '导入题目失败'
    });
  }
});

// 添加单个题目
app.post('/api/questions', async (req: Request, res: Response) => {
  try {
    const { question, options, correctAnswer, type } = req.body;
    
    if (!question || !options || !correctAnswer) {
      return res.status(400).json({
        success: false,
        message: '题目、选项和正确答案都是必填项'
      });
    }
    
    const newQuestion = await Question.create({
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
  } catch (error) {
    console.error('添加题目失败:', error);
    res.status(500).json({
      success: false,
      message: '添加题目失败'
    });
  }
});

// 删除题目
app.delete('/api/questions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Question.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: '删除题目成功'
    });
  } catch (error) {
    console.error('删除题目失败:', error);
    res.status(500).json({
      success: false,
      message: '删除题目失败'
    });
  }
});

// 获取考试设置
app.get('/api/users/settings', async (req: Request, res: Response) => {
  try {
    let settings = await Setting.findOne();
    
    if (!settings) {
      settings = await Setting.create(defaultSettings);
    }
    
    res.json({
      questionCount: settings.questionCount,
      examDuration: settings.examDuration,
      passingScore: settings.passingScore,
      lastUpdated: settings.lastUpdated
    });
  } catch (error) {
    console.error('获取设置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取设置失败'
    });
  }
});

// 保存考试设置
app.post('/api/users/settings', async (req: Request, res: Response) => {
  try {
    const { questionCount, examDuration, passingScore } = req.body;
    
    // 查找或创建设置
    let settings = await Setting.findOne();
    
    if (!settings) {
      settings = new Setting();
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
  } catch (error) {
    console.error('保存设置失败:', error);
    res.status(500).json({
      success: false,
      message: '保存设置失败'
    });
  }
});

// 清空题库（需要管理员密码）
app.post('/api/questions/clear', async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    
    // 验证管理员密码
    if (password !== 'admin123') {
      return res.status(403).json({
        success: false,
        message: '管理员密码不正确'
      });
    }
    
    // 清空题库
    await Question.deleteMany({});
    
    // 返回成功信息
    res.json({
      success: true,
      message: '题库已清空'
    });
  } catch (error) {
    console.error('清空题库失败:', error);
    res.status(500).json({
      success: false,
      message: '清空题库失败'
    });
  }
});

// 更新题目
app.put('/api/questions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { question, options, correctAnswer, type } = req.body;
    
    if (!question || !options || !correctAnswer) {
      return res.status(400).json({
        success: false,
        message: '题目、选项和正确答案都是必填项'
      });
    }
    
    const updatedQuestion = await Question.findByIdAndUpdate(
      id,
      { question, options, correctAnswer, type: type || 'single' },
      { new: true }
    );
    
    if (!updatedQuestion) {
      return res.status(404).json({
        success: false,
        message: '题目不存在'
      });
    }
    
    res.json({
      success: true,
      message: '更新题目成功',
      question: updatedQuestion
    });
  } catch (error) {
    console.error('更新题目失败:', error);
    res.status(500).json({
      success: false,
      message: '更新题目失败'
    });
  }
});

// 检查用户是否已参加过考试
app.get('/api/exams/check/:name/:department', async (req: Request, res: Response) => {
  try {
    const { name, department } = req.params;
    
    // 查询用户是否已有考试记录
    const exam = await ExamResult.findOne({ userName: name, department });
    
    // 获取当前考试模式
    let examMode = 'unlimited'; // 默认为无限制模式
    try {
      const modeSetting = await SystemSetting.findOne({ key: 'examMode' });
      if (modeSetting) {
        examMode = modeSetting.value;
      }
    } catch (err) {
      console.error('获取考试模式设置失败:', err);
    }
    
    console.log('用户考试检查:', {
      name, 
      department, 
      hasCompletedExam: !!exam, 
      examMode
    });
    
    if (exam) {
      // 如果存在考试记录，计算分数等信息并返回
      const totalQuestions = exam.totalQuestions || exam.questions.length;
      const correctAnswers = exam.correctAnswers || exam.questions.filter(q => q.userAnswer === q.answer).length;
      const score = exam.score || Math.round((correctAnswers / totalQuestions) * 100);
      const passingScore = exam.passingScore || 60;
      const isPassed = score >= passingScore;
      
      const examData = {
        score,
        totalQuestions,
        correctAnswers,
        passingScore,
        isPassed,
        date: exam.timestamp
      };
      
      return res.json({
        success: true,
        hasCompletedExam: true,
        examData,
        canRetake: examMode === 'unlimited' // 只有无限制模式下才能重考
      });
    }
    
    // 如果不存在考试记录
    res.json({
      success: true,
      hasCompletedExam: false
    });
  } catch (error) {
    console.error('检查考试记录错误:', error);
    res.status(500).json({
      success: false,
      message: '检查考试记录失败'
    });
  }
});

// 获取系统设置
app.get('/api/admin/settings', async (req: Request, res: Response) => {
  try {
    const settings = await SystemSetting.find();
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('获取系统设置错误:', error);
    res.status(500).json({
      success: false,
      message: '获取系统设置失败'
    });
  }
});

// 更新系统设置
app.post('/api/admin/settings', async (req: Request, res: Response) => {
  try {
    const { key, value } = req.body;
    
    // 验证参数
    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        message: '请提供完整的设置信息'
      });
    }
    
    // 查找或创建设置
    let setting = await SystemSetting.findOne({ key });
    
    if (!setting) {
      setting = new SystemSetting({
        key,
        value,
        updatedAt: new Date()
      });
    } else {
      setting.value = value;
      setting.updatedAt = new Date();
    }
    
    await setting.save();
    
    console.log(`设置已更新: ${key} = ${value}`);
    
    res.json({
      success: true,
      message: '设置已更新',
      setting
    });
  } catch (error) {
    console.error('更新设置错误:', error);
    res.status(500).json({
      success: false,
      message: '更新设置失败'
    });
  }
});

// 获取答题模式设置
app.get('/api/settings/exam-mode', async (req: Request, res: Response) => {
  try {
    const setting = await SystemSetting.findOne({ key: 'examMode' });
    
    // 如果找不到设置，使用默认值
    const examMode = setting ? setting.value : 'unlimited';
    
    res.json({
      success: true,
      examMode
    });
  } catch (error) {
    console.error('获取答题模式设置错误:', error);
    res.status(500).json({
      success: false,
      message: '获取答题模式设置失败'
    });
  }
});

// 健康检查路由
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// 处理所有前端路由
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 连接数据库并启动服务器
const startServer = async () => {
  try {
    // 连接数据库
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB连接成功');
    
    // 初始化数据库
    await initializeDatabase();
    
    // 初始化系统设置
    await initSystemSettings();
    
    // 启动服务器
    app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
    });
  } catch (err) {
    console.error('MongoDB连接失败:', err);
  }
};

// 启动服务器
startServer();

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