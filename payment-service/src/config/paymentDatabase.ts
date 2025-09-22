import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { Logger } from '../utils/logger';

// Ensure .env is loaded before reading ENV vars
dotenv.config();

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

export async function connectPaymentDB(): Promise<void> {
  try {
    Logger.info('Connecting to Payment Database (MySQL)...');
    
    // Test the connection
    await prisma.$connect();
    
    Logger.success('Payment Service - MySQL Connected via Prisma');
  } catch (error) {
    Logger.error('Payment Service - Database connection failed', error);
    // Don't throw to allow service to start and return 503 on DB-dependent routes
  }
}

export async function disconnectPaymentDB(): Promise<void> {
  try {
    await prisma.$disconnect();
    Logger.info('Payment Service - MySQL Disconnected');
  } catch (error) {
    Logger.error('Payment Service - Database disconnection error', error);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await disconnectPaymentDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectPaymentDB();
  process.exit(0);
});