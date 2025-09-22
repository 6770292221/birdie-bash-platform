import { Payment as PrismaPayment, PaymentTransaction as PrismaPaymentTransaction, PaymentStatus, PaymentType, TransactionType } from '@prisma/client';

// Export Prisma types directly
export { PaymentStatus, PaymentType, TransactionType };

// Extended interfaces that include relations
export interface IPayment extends PrismaPayment {
  transactions?: IPaymentTransaction[];
}

export interface IPaymentTransaction extends PrismaPaymentTransaction {
  payment?: IPayment;
}

// Helper type for creating payments (without auto-generated fields)
export interface CreatePaymentData {
  id?: string;
  eventId?: string;
  playerId: string;
  amount: number;
  currency?: string;
  status?: PaymentStatus;
  paymentType: PaymentType;
  paymentIntentId?: string;
  paymentMethodId?: string;
  chargeId?: string;
  description?: string;
  refundedAmount?: number;
  metadata?: any;
}

// Helper type for creating payment transactions
export interface CreatePaymentTransactionData {
  id?: string;
  paymentId: string;
  type: TransactionType;
  amount: number;
  status: PaymentStatus;
  transactionId?: string;
  metadata?: any;
}