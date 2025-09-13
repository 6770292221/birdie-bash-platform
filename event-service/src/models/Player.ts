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
      type: String,
      required: false,
    },
    name: {
      type: String,
      required: false,
      trim: true,
    },
    email: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || /^[0-9\-\+\(\)\s]{10,15}$/.test(v);
        },
        message: 'Phone number must be 10-15 digits and may contain +, -, (, ), space'
      }
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
    createdBy: {
      type: String,
      required: false,
      description: 'Admin user ID who created this guest registration',
    },
  },
  {
    timestamps: true,
  }
);

PlayerSchema.index({ eventId: 1, userId: 1 }, { unique: true, sparse: true });
PlayerSchema.index({ eventId: 1, phoneNumber: 1 }, { unique: true, sparse: true });

export default mongoose.model<IPlayerDocument>('Player', PlayerSchema);