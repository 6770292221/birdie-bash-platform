import mongoose, { Schema, InferSchemaType } from 'mongoose';

const GameLogSchema = new Schema({
  eventId: { type: String, index: true, required: true },
  gameId: { type: String, required: true },
  courtId: { type: String, index: true, required: true },
  action: { type: String, enum: ['seed','advance'], required: true },
  at: { type: String, required: true },
  startTime: { type: String, required: true },
  players: [{
    id: String,
    name: String
  }],
  anchors: [String],
  queueBefore: [String],
  queueAfter: [String],
  metrics: {
    playersCount: Number
  },
  createdAt: { type: Date, default: () => new Date() }
}, { versionKey: false });

export type GameLogDoc = InferSchemaType<typeof GameLogSchema>;

export const GameLog = mongoose.model('game_logs', GameLogSchema);
