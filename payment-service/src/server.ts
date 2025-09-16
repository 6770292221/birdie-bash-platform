import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectPaymentDB } from "./config/paymentDatabase";
import { errorHandler } from "./middleware/errorHandler";
import { startGrpcServer } from "./grpcServer";
import { Logger } from "./utils/logger";
import { OmiseWebhookEvent, WebhookResponse } from "./types/payment";

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

// Omise Webhook endpoint for testing connection
app.post('/webhooks/omise', (req: Request, res: Response) => {
  try {
    const webhookEvent: OmiseWebhookEvent = req.body;
    
    Logger.success('Omise webhook received successfully!', {
      event_id: webhookEvent.id,
      event_type: webhookEvent.key,
      livemode: webhookEvent.livemode,
      data_object: webhookEvent.data?.object,
      data_id: webhookEvent.data?.id,
      amount: webhookEvent.data?.amount,
      currency: webhookEvent.data?.currency,
      status: webhookEvent.data?.status,
      created_at: webhookEvent.created_at,
      full_payload: webhookEvent
    });

    const response: WebhookResponse = {
      received: true,
      timestamp: new Date().toISOString(),
      event_type: webhookEvent.key || 'unknown',
      event_id: webhookEvent.id || 'unknown',
      message: 'Webhook received and logged successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    Logger.error('Error processing Omise webhook', error);
    
    const errorResponse: WebhookResponse = {
      received: false,
      timestamp: new Date().toISOString(),
      event_type: 'error',
      event_id: 'unknown',
      message: 'Error processing webhook'
    };

    res.status(400).json(errorResponse);
  }
});

// Error handling middleware
app.use(errorHandler);

// Database connection
connectPaymentDB();

// Start gRPC server
startGrpcServer();

// Start HTTP server (only for health checks)
app.listen(BASE_PORT, () => {
  Logger.server(`HTTP server running on port ${BASE_PORT} (health check only)`);
  Logger.info(`Health check available at: http://localhost:${BASE_PORT}/health`);
});

export default app;