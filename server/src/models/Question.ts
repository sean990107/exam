import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  question: string;
  options: string[];
  correctAnswer: string;
  type: 'single' | 'multiple';
  createdAt: Date;
}

const QuestionSchema: Schema = new Schema({
  question: { 
    type: String, 
    required: true 
  },
  options: { 
    type: [String], 
    required: true 
  },
  correctAnswer: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['single', 'multiple'],
    default: 'single'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model<IQuestion>('Question', QuestionSchema); 