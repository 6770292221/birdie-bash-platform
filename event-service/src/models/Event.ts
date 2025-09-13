import mongoose, { Schema, Document } from "mongoose";
import { IEvent } from "../types/event";

export interface IEventDocument extends Omit<IEvent, "id">, Document {}

const CourtTimeSchema = new Schema(
  {
    courtNumber: { type: Number, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  { _id: false }
);

const CapacitySchema = new Schema(
  {
    maxParticipants: { type: Number, required: true, min: 1 },
    currentParticipants: { type: Number, default: 0, min: 0 },
    availableSlots: { type: Number, default: 0, min: 0 },
    waitlistEnabled: { type: Boolean, default: false },
  },
  { _id: false }
);

const EventSchema: Schema = new Schema(
  {
    eventName: { type: String, required: true, trim: true },
    eventDate: { type: String, required: true },
    location: { type: String, required: true, trim: true },
    status: { 
      type: String, 
      enum: ["active", "canceled", "completed"], 
      default: "active" 
    },
    capacity: { type: CapacitySchema, required: true },
    shuttlecockPrice: { type: Number, required: true },
    courtHourlyRate: { type: Number, required: true },
    courts: [CourtTimeSchema],
    createdBy: { type: String, required: false },
  },
  { timestamps: true, bufferCommands: false }
);

// Prevent duplicate events by name+date+location
EventSchema.index({ eventName: 1, eventDate: 1, location: 1 }, { unique: true, name: 'uniq_event_key' });

EventSchema.pre("save", function (next) {
  const doc = this as any;

  // Calculate derived capacity fields
  const maxP = doc.capacity?.maxParticipants ?? 0;
  const curP = doc.capacity?.currentParticipants ?? 0;
  const available = Math.max(0, maxP - curP);

  if (!doc.capacity) doc.capacity = {};
  doc.capacity.availableSlots = available;
  doc.capacity.waitlistEnabled =
    doc.status === "active" && available <= 0;

  next();
});

export default mongoose.model<IEventDocument>("Event", EventSchema);
