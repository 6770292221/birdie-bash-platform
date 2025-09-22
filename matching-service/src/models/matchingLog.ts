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

const MatchRunSchema = new Schema({
  eventId: { type: String, index: true, required: true },
  type: { type: String, enum: ['seed','advance','advance-all'], required: true },
  at: { type: String, required: true },
  courtsAffected: [String],
  queueBefore: [String],
  queueAfter: [String],
  gamesStarted: [{ gameId: String, courtId: String }],
  createdAt: { type: Date, default: () => new Date() }
}, { versionKey: false });

export type GameLogDoc = InferSchemaType<typeof GameLogSchema>;
export type MatchRunDoc = InferSchemaType<typeof MatchRunSchema>;

export const GameLog = mongoose.model('game_logs', GameLogSchema);
export const MatchRun = mongoose.model('match_runs', MatchRunSchema);
