import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Ensure .env is loaded before reading ENV vars
dotenv.config();

const EVENT_DB_URI = process.env.EVENT_DB_URI || 'mongodb://localhost:27017/birdie_events';

// Disable buffering globally so queries fail fast when not connected
mongoose.set('bufferCommands', false);

export async function connectEventDB(): Promise<void> {
  try {
    await mongoose.connect(EVENT_DB_URI);
    console.log('Event Service - MongoDB Connected');
  } catch (error) {
    console.error('Event Service - Database connection failed:', error);
    // Don't throw to allow service to start and return 503 on DB-dependent routes
  }
}

mongoose.connection.on('error', (error) => {
  console.error('Event Service - MongoDB Error:', error);
});

mongoose.connection.on('disconnected', () => {
  console.warn('Event Service - MongoDB Disconnected');
});
