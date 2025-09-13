import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Ensure .env is loaded before reading ENV vars
dotenv.config();

const PAYMENT_DB_URI = process.env.PAYMENT_DB_URI || 'mongodb://localhost:27017/birdie_payments';

// Disable buffering globally so queries fail fast when not connected
mongoose.set('bufferCommands', false);

export async function connectPaymentDB(): Promise<void> {
  try {
    await mongoose.connect(PAYMENT_DB_URI);
    console.log('Payment Service - MongoDB Connected');
  } catch (error) {
    console.error('Payment Service - Database connection failed:', error);
    // Don't throw to allow service to start and return 503 on DB-dependent routes
  }
}

mongoose.connection.on('error', (error) => {
  console.error('Payment Service - MongoDB Error:', error);
});

mongoose.connection.on('disconnected', () => {
  console.warn('Payment Service - MongoDB Disconnected');
});