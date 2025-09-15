import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Logger } from '../utils/logger';

// Ensure .env is loaded before reading ENV vars
dotenv.config();

const SETTLEMENT_DB_URI = process.env.SETTLEMENT_DB_URI || 'mongodb://localhost:27017/birdie_settlements';
// const PAYMENT_DB_URI = process.env.PAYMENT_DB_URI || 'mongodb://localhost:27017/birdie_payments';


// Disable buffering globally so queries fail fast when not connected
mongoose.set('bufferCommands', false);

export async function connectSettlementDB(): Promise<void> {
  try {
    Logger.info('Connecting to settlement Database...', { uri: SETTLEMENT_DB_URI.replace(/\/\/.*@/, '//***:***@') });
    await mongoose.connect(SETTLEMENT_DB_URI, {});
    Logger.success('Settlement Service - MongoDB Connected', { database: 'birdie_settlements' });
  } catch (error) {
    Logger.error('settlement Service - Database connection failed', error);
    // Don't throw to allow service to start and return 503 on DB-dependent routes
  }
}

mongoose.connection.on('error', (error) => {
  Logger.error('Settlement Service - MongoDB Error', error);
});

mongoose.connection.on('disconnected', () => {
  Logger.warning('Settlement Service - MongoDB Disconnected');
});