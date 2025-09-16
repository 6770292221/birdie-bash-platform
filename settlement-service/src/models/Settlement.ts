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

export interface ISettlement extends Document {
  settlementId: string;
  eventId: string;
  eventData?: {
    players: Array<{
      playerId: string;
      startTime: string;
      endTime: string;
      status: 'played' | 'canceled' | 'waitlist';
      role: 'member' | 'admin' | 'guest';
      guestInfo?: {
        name: string;
        phoneNumber: string;
      };
    }>;
    courts: Array<{
      courtNumber: number;
      startTime: string;
      endTime: string;
      hourlyRate: number;
    }>;
    costs: {
      shuttlecockPrice: number;
      shuttlecockCount: number;
      penaltyFee: number;
    };
    currency: string;
  };
  calculationResults: Array<{
    playerId: string;
    playerDetails?: {
      name: string;
      phoneNumber?: string;
    };
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
  totalCollected: number;
  successfulCharges: number;
  failedCharges: number;
  status: SettlementStatus;
  createdAt: Date;
  updatedAt: Date;
  lastStatusChange: Date;
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

const SettlementSchema: Schema = new Schema({
  settlementId: { type: String, required: true, unique: true },
  eventId: { type: String, required: true },
  eventData: {
    players: [{
      playerId: { type: String, required: true }, // Can be ObjectId for members or generated ID for guests
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
      status: { type: String, required: true, enum: ['played', 'canceled', 'waitlist'] },
      role: { type: String, required: true, enum: ['member', 'admin', 'guest'] },
      guestInfo: {
        name: { type: String },
        phoneNumber: { type: String }
      }
    }],
    courts: [{
      courtNumber: { type: Number, required: true },
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
      hourlyRate: { type: Number, required: true }
    }],
    costs: {
      shuttlecockPrice: { type: Number, required: true },
      shuttlecockCount: { type: Number, required: true },
      penaltyFee: { type: Number, required: true }
    },
    currency: { type: String, required: true, default: 'THB' }
  },
  calculationResults: [{
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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
        costPerPlayer: { type: Number, required: true }
      }]
    }
  }],
  totalCollected: { type: Number, required: true },
  successfulCharges: { type: Number, default: 0 },
  failedCharges: { type: Number, default: 0 },
  status: {
    type: String,
    required: true,
    enum: Object.values(SettlementStatus),
    default: SettlementStatus.PENDING
  },
  lastStatusChange: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for better query performance
SettlementSchema.index({ eventId: 1 });
SettlementSchema.index({ status: 1 });
SettlementSchema.index({ createdAt: -1 });
SettlementSchema.index({ settlementId: 1 });
SettlementSchema.index({ 'calculationResults.playerId': 1 });

export const Settlement = mongoose.model<ISettlement>('Settlement', SettlementSchema);