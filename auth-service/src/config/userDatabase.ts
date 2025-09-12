import mongoose from 'mongoose';

const USER_DB_URI = process.env.USER_DB_URI || 'mongodb://localhost:27017/birdie_auth';

export const userDbConnection = mongoose.createConnection(USER_DB_URI, {
  bufferCommands: false,
});

userDbConnection.on('connected', () => {
  console.log('Auth Service - User Database Connected');
});

userDbConnection.on('error', (error) => {
  console.error('Auth Service - User Database Connection Error:', error);
});

userDbConnection.on('disconnected', () => {
  console.log('Auth Service - User Database Disconnected');
});