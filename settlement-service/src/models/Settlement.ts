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
  eventId?: string;
  playerId: string;
  amount: number;
  currency: string;
  status: SettlementStatus;
  paymentIntentId?: string;
  paymentMethodId?: string;
  chargeId?: string;
  description?: string;
  refundedAmount: number;
  transactions: ISettlementTransaction[];
  metadata?: Record<string, any>;
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
  eventId: { type: String },
  playerId: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true, default: 'THB' },
  status: {
    type: String,
    required: true,
    enum: Object.values(SettlementStatus),
    default: SettlementStatus.PENDING
  },
  paymentIntentId: { type: String },
  paymentMethodId: { type: String },
  chargeId: { type: String },
  description: { type: String },
  refundedAmount: { type: Number, default: 0 },
  transactions: [SettlementTransactionSchema],
  metadata: { type: Schema.Types.Mixed },
  lastStatusChange: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for better query performance
SettlementSchema.index({ playerId: 1 });
SettlementSchema.index({ eventId: 1 });
SettlementSchema.index({ status: 1 });
SettlementSchema.index({ paymentIntentId: 1 });
SettlementSchema.index({ createdAt: -1 });
SettlementSchema.index({ settlementId: 1 });

export const Settlement = mongoose.model<ISettlement>('Settlement', SettlementSchema);