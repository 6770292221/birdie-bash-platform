import mongoose from 'mongoose';

const userDbConnection = mongoose.createConnection();

export const connectUserDB = async (): Promise<void> => {
  try {
    await userDbConnection.openUri(process.env.USER_DB_URI!);
    console.log(`User DB Connected: ${userDbConnection.host}`);
    console.log(`User Database: ${userDbConnection.name}`);
  } catch (error) {
    console.error('User database connection error:', error);
    process.exit(1);
  }
};

export { userDbConnection };