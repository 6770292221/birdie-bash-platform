import { Schema, Document, model } from 'mongoose';
import { ICourt } from '../types/event';

export interface ICourtDocument extends Omit<ICourt, 'id'>, Document {}

const CourtSchema: Schema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    courtNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    maxPlayers: {
      type: Number,
      required: true,
      min: 1,
      default: 4,
    },
    currentPlayers: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'maintenance'],
      default: 'available',
    },
  },
  {
    timestamps: true,
  }
);

CourtSchema.index({ eventId: 1, courtNumber: 1 }, { unique: true });

export default model<ICourtDocument>('Court', CourtSchema);