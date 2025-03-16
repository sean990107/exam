import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSetting extends Document {
  key: string;
  value: string;
  description: string;
  updatedAt?: Date;
}

const SystemSettingSchema: Schema = new Schema({
  key: { 
    type: String, 
    required: true,
    unique: true
  },
  value: { 
    type: String, 
    required: true
  },
  description: { 
    type: String, 
    default: '' 
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model<ISystemSetting>('SystemSetting', SystemSettingSchema); 