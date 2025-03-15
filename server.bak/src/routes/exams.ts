import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// 考试结果接口
interface ExamResult {
  id: string;
  userId: string;
  userName: string;
  department: string;
  questions: {
    id: string;
    question: string;
    options: string[];
    answer: string;
    userAnswer: string;
    isCorrect: boolean;
  }[];
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timestamp: number;
}

// 本地数据文件路径
const examsFilePath = path.join(__dirname, '..', 'data', 'exams.json');

// 初始化考试结果文件（如果不存在）
if (!fs.existsSync(examsFilePath)) {
  fs.writeFileSync(examsFilePath, JSON.stringify([], null, 2), 'utf8');
}

// 获取所有考试结果
router.get('/', (req: Request, res: Response) => {
  try {
    const exams = JSON.parse(fs.readFileSync(examsFilePath, 'utf8'));
    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: '获取考试结果失败', error });
  }
});

// 提交考试结果
router.post('/', (req: Request, res: Response) => {
  try {
    const { userId, userName, department, questions, answers } = req.body;
    
    if (!userId || !userName || !department || !questions || !answers) {
      return res.status(400).json({ message: '提交数据不完整' });
    }
    
    // 计算得分
    let correctAnswers = 0;
    const processedQuestions = questions.map((q: any, index: number) => {
      const userAnswer = answers[q.id] || '';
      const isCorrect = userAnswer.toUpperCase() === q.answer.toUpperCase();
      
      if (isCorrect) {
        correctAnswers++;
      }
      
      return {
        ...q,
        userAnswer,
        isCorrect
      };
    });
    
    const score = Math.round((correctAnswers / questions.length) * 100);
    
    // 创建考试结果
    const examResult: ExamResult = {
      id: `exam_${Date.now()}`,
      userId,
      userName,
      department,
      questions: processedQuestions,
      score,
      totalQuestions: questions.length,
      correctAnswers,
      timestamp: Date.now()
    };
    
    // 读取现有考试结果
    let exams = [];
    try {
      exams = JSON.parse(fs.readFileSync(examsFilePath, 'utf8'));
    } catch (error) {
      exams = [];
    }
    
    // 添加新考试结果
    exams.push(examResult);
    
    // 保存到文件
    fs.writeFileSync(examsFilePath, JSON.stringify(exams, null, 2), 'utf8');
    
    res.json({ 
      message: '考试结果提交成功', 
      examId: examResult.id,
      score: examResult.score
    });
  } catch (error) {
    res.status(500).json({ message: '提交考试结果失败', error });
  }
});

// 获取特定考试结果
router.get('/:id', (req: Request, res: Response) => {
  try {
    const examId = req.params.id;
    const exams = JSON.parse(fs.readFileSync(examsFilePath, 'utf8'));
    
    const exam = exams.find((e: ExamResult) => e.id === examId);
    
    if (!exam) {
      return res.status(404).json({ message: '考试结果不存在' });
    }
    
    res.json(exam);
  } catch (error) {
    res.status(500).json({ message: '获取考试结果失败', error });
  }
});

export default router; 