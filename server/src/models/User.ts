import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  department: string;
  password: string;
  isAdmin: boolean;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { 
    type: String, 
    required: true,
    unique: true
  },
  department: { 
    type: String, 
    required: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  isAdmin: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model<IUser>('User', UserSchema); 