import mongoose, { Schema, Document } from "mongoose";

export interface IEventThrottle extends Document {
  key: string;            // "<type>:<eventId>"
  nextAllowedAt: Date;    // เวลา earliest ที่อนุญาตให้ยิงครั้งถัดไป
  expireAt?: Date;        // TTL (ล้างข้อมูลเก่าอัตโนมัติ)
}

const EventThrottleSchema = new Schema<IEventThrottle>({
  key: { type: String, required: true, unique: true },
  nextAllowedAt: { type: Date, required: true },
  expireAt: { type: Date } // ถ้ากำหนด THROTTLE_TTL_SECONDS จะตั้งค่านี้
});

EventThrottleSchema.index({ key: 1 }, { unique: true });
EventThrottleSchema.index({ nextAllowedAt: 1 });
EventThrottleSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IEventThrottle>("EventThrottle", EventThrottleSchema);
