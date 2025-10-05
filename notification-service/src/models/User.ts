import mongoose, { Schema, Document } from "mongoose";

export interface IUser {
  email: string;
  password_hash: string;
  role: "admin" | "user";
  name: string;
  skill: "BG"|"BG+"|"S-"|"S"|"N"|"P-"|"P"|"P+"|"C"|"B"|"A";
  phoneNumber?: string;
}
export interface IUserDocument extends Omit<IUser,"id">, Document {}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ["admin","user"], default: "user" },
  name: { type: String, required: true, trim: true },
  skill: { type: String, enum: ["BG","BG+","S-","S","N","P-","P","P+","C","B","A"], required: true },
  phoneNumber: {
    type: String, trim: true,
    validate: {
      validator(v: string) {
        if (!v) return true;
        return /^(\+|00)[1-9]\d{0,4}\d{4,14}$/.test(v) || /^0[0-9]{8,9}$/.test(v);
      },
      message: "Phone number format is invalid",
    },
  },
},{ timestamps: true });

export default mongoose.model<IUserDocument>("User", UserSchema);
