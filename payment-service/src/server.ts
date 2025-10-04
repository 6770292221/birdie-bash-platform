import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectPaymentDB } from "./config/paymentDatabase";
import { errorHandler } from "./middleware/errorHandler";
import { startGrpcServer } from "./grpcServer";
import { startPaymentIssueConsumer } from './consumers/paymentIssueConsumer';
import { Logger } from "./utils/logger";
import { webhookService } from "./services/webhookService";

dotenv.config();

const app = express();
const BASE_PORT = Number(process.env.PORT) || 3003;

app.use(cors());
app.use(express.json());

// Health check endpoint - the only REST endpoint we keep
app.get('/health', (req: Request, res: Response) => {
  Logger.info('Health check requested');
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'payment-service',
    protocols: {
      grpc: `localhost:${process.env.GRPC_PORT || '50051'}`,
      http: `localhost:${BASE_PORT} (health check only)`
    }
  });
});

// Omise Webhook endpoint - now processes events and updates payment status
app.post('/webhooks/omise', (req: Request, res: Response) => webhookService.handleOmiseWebhookHttp(req, res));

// Error handling middleware
app.use(errorHandler);

// Display banner on startup
Logger.displayBanner();

// Database connection
connectPaymentDB();

// Start gRPC server
startGrpcServer();

// Start RabbitMQ consumer for payment.issue queue (fire & forget)
startPaymentIssueConsumer().catch(err => Logger.error('Failed to start payment issue consumer', err));

// Start HTTP server (only for health checks)
app.listen(BASE_PORT, () => {
  Logger.server(`HTTP server running on port ${BASE_PORT} (health check only)`);
  Logger.info(`Health check available at: http://localhost:${BASE_PORT}/health`);
});

export default app;