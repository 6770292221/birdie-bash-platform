import dotenv from 'dotenv';
import { connectPaymentDB } from './config/paymentDatabase';
import { startGrpcServer } from './grpcServer';

// Load environment variables
dotenv.config();

// Connect to database
connectPaymentDB();

// Start gRPC server only
startGrpcServer();

console.log('Payment Service gRPC server starting...');