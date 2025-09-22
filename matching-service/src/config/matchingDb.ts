import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Logger } from '../utils/logger';

// Ensure .env is loaded before reading ENV vars
dotenv.config();

const MATCHING_DB_URI = process.env.MATCHING_DB_URI || 'mongodb://localhost:27017/birdie_matchings';
// const PAYMENT_DB_URI = process.env.PAYMENT_DB_URI || 'mongodb://localhost:27017/birdie_payments';


// Disable buffering globally so queries fail fast when not connected
mongoose.set('bufferCommands', false);

export async function connectMatchingDB(): Promise<void> {
  try {
    Logger.info('Connecting to matching Database...', { uri: MATCHING_DB_URI.replace(/\/\/.*@/, '//***:***@') });
    await mongoose.connect(MATCHING_DB_URI, {});
    Logger.success('Matching Service - MongoDB Connected', { database: 'birdie_matchings' });
  } catch (error) {
    Logger.error('Matching Service - Database connection failed', error);
    // Don't throw to allow service to start and return 503 on DB-dependent routes
  }
}

mongoose.connection.on('error', (error) => {
  Logger.error('Matching Service - MongoDB Error', error);
});

mongoose.connection.on('disconnected', () => {
  Logger.warning('Matching Service - MongoDB Disconnected');
});