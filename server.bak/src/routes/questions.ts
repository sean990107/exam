import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import xlsx from 'xlsx';
import fs from 'fs';

const router = express.Router();
// 确保uploads目录存在
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ dest: uploadsDir });

// 导入题库的数据模型接口
interface Question {
  id: string;
  question: string; // 题干
  options: string[]; // 选项A、B、C、D
  answer: string; // 正确答案，如"A"或"BCD"
}

// 本地数据文件路径
const questionsFilePath = path.join(__dirname, '..', 'data', 'questions.json');

// 初始化题库文件（如果不存在）
if (!fs.existsSync(questionsFilePath)) {
  fs.writeFileSync(questionsFilePath, JSON.stringify([], null, 2), 'utf8');
}

// 获取所有题目
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const questions = JSON.parse(fs.readFileSync(questionsFilePath, 'utf8'));
    res.json(questions);
  } catch (error) {
    next(error);
  }
});

// 上传并导入Excel题库
router.post('/import', upload.single('file'), (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '未上传文件' });
    }

    // 读取上传的Excel文件
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    // 转换Excel数据为题目格式
    const questions: Question[] = [];
    data.forEach((row: any, index: number) => {
      if (index === 0) return; // 跳过标题行
      if (row.length < 6) return; // 确保数据完整

      const question: Question = {
        id: `q${index}`,
        question: row[0], // 第一列：题干
        options: [row[1], row[2], row[3], row[4]], // 第二到五列：选项A-D
        answer: row[5], // 第六列：正确答案
      };
      
      questions.push(question);
    });

    // 保存到本地JSON文件
    fs.writeFileSync(questionsFilePath, JSON.stringify(questions, null, 2), 'utf8');

    // 删除临时上传文件
    fs.unlinkSync(req.file.path);

    res.json({ 
      message: '题库导入成功', 
      count: questions.length 
    });
  } catch (error) {
    next(error);
  }
});

// 随机获取指定数量的题目
router.get('/random/:count', (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = parseInt(req.params.count);
    const allQuestions = JSON.parse(fs.readFileSync(questionsFilePath, 'utf8'));
    
    if (count >= allQuestions.length) {
      return res.json(allQuestions);
    }
    
    // Fisher-Yates洗牌算法随机选择题目
    const shuffled = [...allQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    const randomQuestions = shuffled.slice(0, count);
    res.json(randomQuestions);
  } catch (error) {
    next(error);
  }
});

export default router; 