import mongoose, { Schema, Document } from "mongoose";

export interface IProcessedEvent extends Document {
  key: string;        // รูปแบบ: "<type>:<eventId>"
  createdAt: Date;    // เวลาล็อก
  expireAt: Date;     // TTL สำหรับลบล็อกอัตโนมัติ -> อนุญาตให้ยิงใหม่หลัง TTL
}

const ProcessedEventSchema = new Schema<IProcessedEvent>({
  key: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, required: true },
  expireAt: { type: Date, required: true } // จะตั้งค่าเป็น now + DEDUP_TTL_SECONDS ตอน insert
});

// ดัชนี TTL: Expire ทันทีที่ถึงเวลา
ProcessedEventSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
ProcessedEventSchema.index({ key: 1 }, { unique: true });

export default mongoose.model<IProcessedEvent>("ProcessedEvent", ProcessedEventSchema);

