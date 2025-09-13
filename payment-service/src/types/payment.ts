export interface PaymentRequest {
  eventId: string;
  playerId: string;
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface ChargeRequest extends PaymentRequest {
  paymentMethodId?: string;
  paymentIntentId?: string;
}

export interface RefundRequest {
  paymentId: string;
  amount?: number; // partial refund if specified, full refund if not
  reason?: string;
}

export interface PaymentConfirmation {
  paymentId: string;
  paymentIntentId?: string;
  paymentMethodId?: string;
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  CANCELLED = 'cancelled'
}

export enum PaymentType {
  EVENT_REGISTRATION = 'event_registration',
  MEMBERSHIP_FEE = 'membership_fee',
  GUEST_FEE = 'guest_fee',
  DEPOSIT = 'deposit',
  PENALTY = 'penalty'
}

export interface PaymentResponse {
  id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paymentIntentId?: string;
  clientSecret?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentStatusResponse {
  paymentId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  refundedAmount?: number;
  eventId?: string;
  playerId?: string;
  createdAt: Date;
  updatedAt: Date;
  lastStatusChange: Date;
  transactions: PaymentTransaction[];
}

export interface PaymentTransaction {
  id: string;
  type: 'charge' | 'refund' | 'authorization';
  amount: number;
  status: PaymentStatus;
  transactionId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}