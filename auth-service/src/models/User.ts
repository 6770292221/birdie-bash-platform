import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '../types/user';

export interface IUserDocument extends Omit<IUser, 'id'>, Document {}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password_hash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    skill: {
      type: String,
      enum: [
        'BG',   // มือป่าขาแปะ (BG - Beginner)
        'BG+',  // มือหน้าบ้าน (BG - Beginner)
        'S-',   // มือ S- (เล่นเขตพอร์มมาตราส่วน)
        'S',    // มือ S (พอร์มมาตราส่วน)
        'N',    // มือ N (พอร์มแน่นอีขิม)
        'P-',   // มือ P- (พอร์มไปได้เซียวได้ทำได้ไป)
        'P',    // มือ P (พอร์มได้ทำได้ไป)
        'P+',   // มือ P+ (พอร์มมักได้พาดวิจอย์/ชิงวิจอย์)
        'C',    // มือ C (พอร์มมักได้พาดเวย์/เยาวชนกีมาสาดี)
        'B',    // มือ B (พอร์มมักได้พีมยชาตราดับประสาท)
        'A'     // มือ A (พอร์มมักได้พีมยชาตราดับนาขาสาดี)
      ],
      required: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          // Optional field, but if provided, should be valid phone format
          if (!v) return true; // Allow empty
          return /^(\+|00)[1-9]\d{0,4}\d{4,14}$/.test(v) || /^0[0-9]{8,9}$/.test(v);
        },
        message: 'Phone number format is invalid'
      }
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUserDocument>('User', UserSchema);
