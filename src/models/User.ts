import { Schema, Document } from 'mongoose';
import { IUser } from '../types/user';
import { userDbConnection } from '../config/userDatabase';

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
      enum: ['S', 'P', 'BG', 'N'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default userDbConnection.model<IUserDocument>('User', UserSchema);