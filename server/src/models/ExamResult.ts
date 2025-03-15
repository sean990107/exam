import mongoose, { Schema, Document } from 'mongoose';

interface IQuestionResult {
  id: string;
  question: string;
  options: string[];
  answer: string;
  userAnswer: string;
  isCorrect: boolean;
}

export interface IExamResult extends Document {
  userName: string;
  department: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timestamp: number;
  questions: IQuestionResult[];
  usedTime?: number; // 用时（秒）
  passingScore: number; // 添加及格分数字段
}

const QuestionResultSchema = new Schema({
  id: { type: String, required: true },
  question: { type: String, required: true },
  options: { type: [String], required: true },
  answer: { type: String, required: true },
  userAnswer: { type: String, required: true },
  isCorrect: { type: Boolean, required: true }
});

const ExamResultSchema: Schema = new Schema({
  userName: { 
    type: String, 
    required: true 
  },
  department: { 
    type: String, 
    required: true 
  },
  score: { 
    type: Number, 
    required: true 
  },
  totalQuestions: { 
    type: Number, 
    required: true 
  },
  correctAnswers: { 
    type: Number, 
    required: true 
  },
  timestamp: { 
    type: Number, 
    default: Date.now 
  },
  questions: [QuestionResultSchema],
  usedTime: { 
    type: Number, 
    default: 0 
  },
  passingScore: { 
    type: Number, 
    default: 60 
  }
});

export default mongoose.model<IExamResult>('ExamResult', ExamResultSchema); 