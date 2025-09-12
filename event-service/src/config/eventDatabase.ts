import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Ensure .env is loaded before reading ENV vars
dotenv.config();

const EVENT_DB_URI = process.env.EVENT_DB_URI || 'mongodb://localhost:27017/birdie_events';

export const eventDbConnection = mongoose.createConnection();

eventDbConnection.on('connected', () => {
  console.log('Event Service - Event Database Connected');
});

eventDbConnection.on('error', (error) => {
  console.error('Event Service - Event Database Connection Error:', error);
});

eventDbConnection.on('disconnected', () => {
  console.log('Event Service - Event Database Disconnected');
});

// Initialize connection
eventDbConnection.openUri(EVENT_DB_URI);
