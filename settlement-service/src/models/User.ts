import mongoose, { Schema, Document } from 'mongoose';

// User interface for cross-database reference
export interface IUserRef extends Document {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  skill: string;
  role: string;
}

// User schema for cross-database reference to birdie_auth.users
const UserRefSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phoneNumber: { type: String },
  skill: { type: String, required: true },
  role: { type: String, required: true }
}, {
  collection: 'users', // Reference to birdie_auth.users collection
  timestamps: true
});

// Create connection to auth database
// const authConnection = mongoose.createConnection(
//   process.env.AUTH_DB_URI || 'mongodb://localhost:27017/birdie_auth'
// );

// export const UserRef = authConnection.model<IUserRef>('User', UserRefSchema);