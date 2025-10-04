import { prisma } from '../config/paymentDatabase';
import { PAYMENT_STATUS } from '../constants/paymentStatus';
import { omiseService } from './omiseService';
import { TransactionType } from '../models/Payment';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';
import { publishPaymentCreatedEvent } from '../queue/publisher';

export interface IssueChargeInput {
  player_id: string;
  amount: number; // assumed in major currency unit (e.g. THB)
  event_id: string;
  currency?: string; // default THB
  payment_method?: string; // default PROMPT_PAY
  description?: string | null;
}

export interface IssueChargeResult {
  id: string;
  status: string;
  amount: number;
  currency: string;
  qr_code_uri: string;
  created_at: string;
  updated_at: string;
}

export async function issueCharge(input: IssueChargeInput): Promise<IssueChargeResult> {
  const { player_id, amount, event_id } = input;

  if (!player_id || !amount || !event_id) {
    throw new Error('Missing required fields: player_id, event_id and amount are required');
  }

  // Convert amount to satang (smallest unit for THB)
  const amountInSatang = Math.round(amount * 100);
  const currency = (input.currency || 'THB').toUpperCase();

  Logger.info('Creating Omise source (consumer/service)', {
    amountInSatang,
    currency
  });

  // Step 1: Create Omise source for PromptPay
  const omiseSource = await omiseService.createSource(amountInSatang, currency);
  Logger.success('Omise source created', { sourceId: omiseSource.id });

  // Step 2: Create Omise charge using the source
  const omiseCharge = await omiseService.createCharge(amountInSatang, currency, omiseSource.id);
  Logger.success('Omise charge created', { chargeId: omiseCharge.id, status: omiseCharge.status });

  // Step 3: Display QR code in console (best-effort)
  if (omiseCharge.source?.scannable_code?.image?.download_uri) {
    try { await omiseService.displayQRCode(omiseCharge.source.scannable_code.image.download_uri); } catch (e) { Logger.warning('Failed to display QR code (non-fatal)', e); }
  }

  // Step 4: Create payment record in database
  const paymentId = uuidv4();
  const payment = await prisma.payment.create({
    data: {
      id: paymentId,
      eventId: event_id,
      playerId: player_id,
      amount: amount,
      currency: currency.toLowerCase(),
      status: PAYMENT_STATUS.PENDING,
      description: input.description || null,
      paymentMethod: (input.payment_method || 'PROMPT_PAY'),
      qrCodeUri: omiseCharge.source?.scannable_code?.image?.download_uri || null,
      omiseChargeId: omiseCharge.id,
      omiseSourceId: omiseSource.id,
      transactions: {
        create: {
          id: uuidv4(),
          type: TransactionType.charge,
          amount: amount,
          status: PAYMENT_STATUS.PENDING,
          transactionId: omiseCharge.id,
          timestamp: new Date()
        }
      }
    },
    include: { transactions: true }
  });

  Logger.success('IssueCharge stored payment record', { paymentId });

  // Fire-and-forget publish of payment.created event
  publishPaymentCreatedEvent({
    payment_id: paymentId,
    event_id: payment.eventId || null,
    player_id: payment.playerId,
    amount: payment.amount,
    currency: (payment.currency ?? currency.toLowerCase()),
    qr_code_uri: payment.qrCodeUri || null,
    payment_status: payment.status,
    created_at: payment.createdAt.toISOString()
  }).catch(err => Logger.error('Failed to publish payment.created event', err));

  return {
    id: paymentId,
    status: payment.status,
    amount: payment.amount,
    // prisma type may allow null; ensure we always return a string
    currency: (payment.currency ?? currency.toLowerCase()),
    qr_code_uri: payment.qrCodeUri || '',
    created_at: payment.createdAt.toISOString(),
    updated_at: payment.updatedAt.toISOString()
  };
}
