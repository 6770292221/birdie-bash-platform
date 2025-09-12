import mongoose, { Schema, Document } from 'mongoose';
import { IPlayer } from '../types/event';

export interface IPlayerDocument extends Omit<IPlayer, 'id'>, Document {}

const PlayerSchema: Schema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    startTime: {
      type: String,
      required: false,
    },
    endTime: {
      type: String,
      required: false,
    },
    registrationTime: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['registered', 'waitlist', 'canceled'],
      default: 'registered',
    },
  },
  {
    timestamps: true,
  }
);

PlayerSchema.index({ eventId: 1, email: 1 }, { unique: true });

export default mongoose.model<IPlayerDocument>('Player', PlayerSchema);