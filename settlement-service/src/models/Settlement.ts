import mongoose, { Schema, Document } from 'mongoose';

// Settlement Status enum
export enum SettlementStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  CANCELLED = 'cancelled'
}

// Transaction Type enum
export enum TransactionType {
  CHARGE = 'charge',
  REFUND = 'refund',
  AUTHORIZATION = 'authorization'
}

// Main Settlement interface - includes player data
export interface ISettlement extends Document {
  settlementId: string;
  eventId: string; // Reference to Event Service
  // Player settlement breakdown data
  breakdown: Array<{
    playerId: string;
    courtFee: number;
    shuttlecockFee: number;
    penaltyFee: number;
    totalAmount: number;
    paymentId?: string;
    paymentStatus?: string;
    breakdown: {
      hoursPlayed: number;
      courtSessions: Array<{
        hour: string;
        playersInSession: number;
        costPerPlayer: number;
      }>;
    };
  }>;
  // Summary statistics
  totalCollected: number;
  successfulCharges: number;
  failedCharges: number;
  status: SettlementStatus;
  createdAt: Date;
  updatedAt: Date;
  lastStatusChange: Date;
}

// Individual player settlement result
export interface ISettlementPlayer extends Document {
  settlementId: string; // Reference to Settlement
  playerId: string; // Reference to Registration Service player

  // Calculation results
  courtFee: number;
  shuttlecockFee: number;
  penaltyFee: number;
  totalAmount: number;

  // Payment information
  paymentId?: string;
  paymentStatus?: string;

  // Calculation breakdown
  breakdown: {
    hoursPlayed: number;
    courtSessions: Array<{
      hour: string;
      playersInSession: number;
      costPerPlayer: number;
    }>;
  };

  createdAt: Date;
  updatedAt: Date;
}

export interface ISettlementTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  status: SettlementStatus;
  transactionId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

const SettlementTransactionSchema: Schema = new Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: Object.values(TransactionType)
  },
  amount: { type: Number, required: true },
  status: {
    type: String,
    required: true,
    enum: Object.values(SettlementStatus)
  },
  transactionId: { type: String },
  timestamp: { type: Date, default: Date.now },
  metadata: { type: Schema.Types.Mixed }
});

// Settlement Schema - includes player data
const SettlementSchema: Schema = new Schema({
  settlementId: { type: String, required: true, unique: true },
  eventId: { type: String, required: true, index: true },
  // Player settlement breakdown data
  breakdown: [{
    playerId: { type: String, required: true },
    courtFee: { type: Number, required: true },
    shuttlecockFee: { type: Number, required: true },
    penaltyFee: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    paymentId: { type: String },
    paymentStatus: { type: String },
    breakdown: {
      hoursPlayed: { type: Number, required: true },
      courtSessions: [{
        hour: { type: String, required: true },
        playersInSession: { type: Number, required: true },
        costPerPlayer: { type: Number, required: true },
        _id: false
      }]
    },
    _id: false
  }],
  // Summary statistics
  totalCollected: { type: Number, required: true },
  successfulCharges: { type: Number, default: 0 },
  failedCharges: { type: Number, default: 0 },
  status: {
    type: String,
    required: true,
    enum: Object.values(SettlementStatus),
    default: SettlementStatus.PENDING,
    index: true
  },
  lastStatusChange: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// SettlementPlayer Schema - individual player calculation results
const SettlementPlayerSchema: Schema = new Schema({
  settlementId: { type: String, required: true, index: true },
  playerId: { type: String, required: true, index: true },

  // Calculation results
  courtFee: { type: Number, required: true },
  shuttlecockFee: { type: Number, required: true },
  penaltyFee: { type: Number, required: true },
  totalAmount: { type: Number, required: true },

  // Payment information
  paymentId: { type: String, index: true },
  paymentStatus: { type: String, index: true },

  // Calculation breakdown
  breakdown: {
    hoursPlayed: { type: Number, required: true },
    courtSessions: [{
      hour: { type: String, required: true },
      playersInSession: { type: Number, required: true },
      costPerPlayer: { type: Number, required: true },
      _id: false
    }]
  }
}, {
  timestamps: true
});

// Indexes for better query performance
SettlementSchema.index({ settlementId: 1 });
SettlementSchema.index({ createdAt: -1 });

SettlementPlayerSchema.index({ settlementId: 1, playerId: 1 }, { unique: true });
SettlementPlayerSchema.index({ paymentId: 1 });
SettlementPlayerSchema.index({ createdAt: -1 });

export const Settlement = mongoose.model<ISettlement>('Settlement', SettlementSchema);
export const SettlementPlayer = mongoose.model<ISettlementPlayer>('SettlementPlayer', SettlementPlayerSchema);