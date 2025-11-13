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

// Configure CORS explicitly to support frontend running on host
// Accept comma-separated list in CORS_ORIGINS; default to localhost ports used in dev
const rawOrigins = (process.env.CORS_ORIGINS || "http://localhost:9001,http://127.0.0.1:9001,http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000").split(",").map(o => o.trim()).filter(Boolean);
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // non-browser or same-origin
    if (rawOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: Origin not allowed: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  maxAge: 86400,
};

app.use(cors(corsOptions));
// Ensure preflight requests are handled globally
app.options("*", cors(corsOptions));
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