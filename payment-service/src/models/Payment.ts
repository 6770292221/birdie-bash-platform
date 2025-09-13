import mongoose, { Schema, Document } from 'mongoose';
import { PaymentStatus, PaymentType } from '../types/payment';

export interface IPayment extends Document {
  id: string;
  eventId?: string;
  playerId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentType: PaymentType;
  paymentIntentId?: string;
  paymentMethodId?: string;
  chargeId?: string;
  description?: string;
  refundedAmount: number;
  transactions: IPaymentTransaction[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastStatusChange: Date;
}

export interface IPaymentTransaction {
  id: string;
  type: 'charge' | 'refund' | 'authorization';
  amount: number;
  status: PaymentStatus;
  transactionId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

const PaymentTransactionSchema: Schema = new Schema({
  id: { type: String, required: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['charge', 'refund', 'authorization'] 
  },
  amount: { type: Number, required: true },
  status: { 
    type: String, 
    required: true, 
    enum: Object.values(PaymentStatus) 
  },
  transactionId: { type: String },
  timestamp: { type: Date, default: Date.now },
  metadata: { type: Schema.Types.Mixed }
});

const PaymentSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  eventId: { type: String },
  playerId: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true, default: 'thb' },
  status: { 
    type: String, 
    required: true, 
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING 
  },
  paymentType: { 
    type: String, 
    required: true, 
    enum: Object.values(PaymentType) 
  },
  paymentIntentId: { type: String },
  paymentMethodId: { type: String },
  chargeId: { type: String },
  description: { type: String },
  refundedAmount: { type: Number, default: 0 },
  transactions: [PaymentTransactionSchema],
  metadata: { type: Schema.Types.Mixed },
  lastStatusChange: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for better query performance
PaymentSchema.index({ playerId: 1 });
PaymentSchema.index({ eventId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ paymentIntentId: 1 });
PaymentSchema.index({ createdAt: -1 });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);