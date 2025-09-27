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
    set: (v: any) => (v === null || v === undefined || v === '' ? undefined : v),
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
    isPenalty: {
      type: Boolean,
      default: false,
      description: 'True if cancellation incurred a penalty fee',
    },
    canceledAt: {
      type: Date,
      required: false,
      description: 'Timestamp when registration was canceled',
    },
    userType: {
      type: String,
      enum: ['member', 'guest'],
      required: true,
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

PlayerSchema.index({ eventId: 1, userId: 1 }, {
  unique: true,
  partialFilterExpression: { userId: { $exists: true, $ne: null } }
});
// Enforce uniqueness of phoneNumber per event only when a non-null phoneNumber is provided
PlayerSchema.index(
  { eventId: 1, phoneNumber: 1 },
  { unique: true, partialFilterExpression: { phoneNumber: { $exists: true, $ne: null } }, name: 'uniq_event_phone_if_set' }
);

export default mongoose.model<IPlayerDocument>('Player', PlayerSchema);
