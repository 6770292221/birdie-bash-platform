import mongoose from 'mongoose';

export async function connectRegistrationDB(): Promise<void> {
  try {
    const DB_URI = process.env.REG_DB_URI || process.env.EVENT_DB_URI || 'mongodb://localhost:27017/birdie_event';
    await mongoose.connect(DB_URI);
    console.log('Registration Service - MongoDB Connected');
    if (!process.env.REG_DB_URI) {
      console.warn('Registration Service - Using default local MongoDB URI; set REG_DB_URI in registration-service/.env');
    }
  } catch (error) {
    console.error('Registration Service - Database connection failed:', error);
    process.exit(1);
  }
}

