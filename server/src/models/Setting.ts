import mongoose, { Schema, Document } from 'mongoose';

export interface ISetting extends Document {
  questionCount: number;
  examDuration: number;
  passingScore: number;
  lastUpdated: number;
  questionMode: string;
}

const SettingSchema: Schema = new Schema({
  questionCount: { 
    type: Number, 
    default: 10 
  },
  examDuration: { 
    type: Number, 
    default: 60 
  },
  passingScore: { 
    type: Number, 
    default: 60 
  },
  lastUpdated: { 
    type: Number, 
    default: Date.now 
  },
  questionMode: {
    type: String,
    enum: ['all', 'custom', 'random'],
    default: 'custom'
  }
});

export default mongoose.model<ISetting>('Setting', SettingSchema); 