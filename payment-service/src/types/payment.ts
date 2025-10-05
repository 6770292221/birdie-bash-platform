export interface PaymentRequest {
  event_id?: string;
  player_id: string;
  amount: number;
  currency?: string; // default thb
  description?: string;
  payment_method?: string; // PROMPT_PAY default
}

export interface ChargeRequest extends PaymentRequest {}

export interface RefundRequest {
  paymentId: string;
  amount?: number; // partial refund if specified, full refund if not
  reason?: string;
}

export interface PaymentConfirmation {
  payment_id: string;
}
import { PAYMENT_STATUS, PaymentStatusValue } from '../constants/paymentStatus';
export type PaymentStatus = PaymentStatusValue;

export interface PaymentResponse {
  id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  qr_code_uri?: string;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PaymentStatusResponse {
  payment_id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  event_id?: string;
  player_id?: string;
  created_at: Date;
  updated_at: Date;
  transactions: PaymentTransaction[];
}

export interface PaymentTransaction {
  id: string;
  type: 'charge' | 'refund' | 'authorization';
  amount: number;
  status: PaymentStatus;
  transaction_id?: string;
  timestamp: Date;
}

// Omise Webhook Types
export interface OmiseWebhookEvent {
  object: 'event';
  id: string;
  livemode: boolean;
  location: string;
  created_at: string;
  data: OmiseWebhookData;
  key: string;
  team_uid?: string;
  user_id?: string;
}

export interface OmiseWebhookData {
  object: string;
  id: string;
  amount?: number;
  currency?: string;
  status?: string;
  charge_id?: string;
  transaction_id?: string;
  created_at: string;
  updated_at?: string;
  [key: string]: any; // Allow for additional fields from Omise
}

export interface WebhookResponse {
  received: boolean;
  timestamp: string;
  event_type: string;
  event_id: string;
  message: string;
}