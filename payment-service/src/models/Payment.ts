import { Payment as PrismaPayment, PaymentTransaction as PrismaPaymentTransaction, TransactionType } from '@prisma/client';
import { PaymentStatusValue } from '../constants/paymentStatus';

// Export Prisma types directly
export { TransactionType };

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
  event_id?: string;
  player_id: string;
  amount: number;
  currency?: string;
  status?: PaymentStatusValue;
  payment_method?: string; // PROMPT_PAY default
  qr_code_uri?: string;
  omise_charge_id?: string;
  omise_source_id?: string;
  description?: string;
}

// Helper type for creating payment transactions
export interface CreatePaymentTransactionData {
  id?: string;
  payment_id: string;
  type: TransactionType;
  amount: number;
  status: PaymentStatusValue;
  transaction_id?: string;
}