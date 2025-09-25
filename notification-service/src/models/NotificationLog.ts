import mongoose, { Schema, Document } from 'mongoose';
import { Channel } from '../types/NotificationEvent';

export interface NotificationLogDoc extends Document {
  channels: Channel[];
  source: string;
  payload: any;
  results: Array<{
    channel: Channel;
    status: 'SUCCESS' | 'FAIL' | 'SKIPPED';
    providerId?: string;
    error?: string;
  }>;
  meta?: Record<string, any>;
  createdAt: Date;
}

const NotificationLogSchema = new Schema<NotificationLogDoc>({
  channels: { type: [String], required: true },
  source: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  results: [{
    channel: { type: String, required: true },
    status: { type: String, enum: ['SUCCESS', 'FAIL', 'SKIPPED'], required: true },
    providerId: String,
    error: String
  }],
  meta: { type: Schema.Types.Mixed }
}, { timestamps: { createdAt: true, updatedAt: false } });

export const NotificationLog = mongoose.model<NotificationLogDoc>('NotificationLog', NotificationLogSchema);
