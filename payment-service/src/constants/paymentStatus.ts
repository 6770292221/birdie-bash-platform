// Central definition of payment status string literals (formerly enums)
export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
} as const;

export type PaymentStatusValue = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

export const ALL_PAYMENT_STATUS: PaymentStatusValue[] = Object.values(PAYMENT_STATUS);

export function isPaymentStatus(value: any): value is PaymentStatusValue {
  return typeof value === 'string' && ALL_PAYMENT_STATUS.includes(value as PaymentStatusValue);
}