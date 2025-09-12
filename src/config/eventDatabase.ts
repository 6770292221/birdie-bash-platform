import mongoose from 'mongoose';

const eventDbConnection = mongoose.createConnection();

export const connectEventDB = async (): Promise<void> => {
  try {
    await eventDbConnection.openUri(process.env.EVENT_DB_URI!);
    console.log(`Event DB Connected: ${eventDbConnection.host}`);
    console.log(`Event Database: ${eventDbConnection.name}`);
  } catch (error) {
    console.error('Event database connection error:', error);
    process.exit(1);
  }
};

export { eventDbConnection };