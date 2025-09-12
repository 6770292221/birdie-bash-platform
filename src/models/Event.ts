import { Schema, Document } from 'mongoose';
import { IEvent } from '../types/event';
import { eventDbConnection } from '../config/eventDatabase';

export interface IEventDocument extends Omit<IEvent, 'id'>, Document {}

const EventSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    maxParticipants: {
      type: Number,
      required: true,
      min: 1,
    },
    currentParticipants: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'canceled', 'completed'],
      default: 'active',
    },
    location: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default eventDbConnection.model<IEventDocument>('Event', EventSchema);