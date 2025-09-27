import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerSpecs from "./config/swagger";
import { connectSettlementDB } from "./config/settlementDatabase";
import { errorHandler } from "./middleware/errorHandler";
import { Logger } from "./utils/logger";
import settlementRoutes from "./routes/settlementRoutes";
import path from "path";
// Import model to register it with Mongoose
import { Settlement } from "./models/Settlement";
import { RabbitMQPublisher } from "./clients/rabbitmqClient";

dotenv.config();

const app = express();
const BASE_PORT = Number(process.env.PORT) || 3005;

app.use(cors());
app.use(express.json());

// API Docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.json(swaggerSpecs);
});

// Settlement API routes
app.use('/api/settlements', settlementRoutes);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  Logger.info('Health check requested');
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'settlement-service',
    protocols: {
      grpc: `localhost:${process.env.GRPC_PORT || '50051'}` + ' (Payment Service)',
      http: `localhost:${BASE_PORT}`,
      endpoints: {
        health: '/health',
        settlements: '/api/settlements',
        test: '/test-db',
        docs: '/api-docs'
      }
    }
  });
});

// Test database endpoint - creates a sample settlement to initialize database
app.get('/test-db', async (_req: Request, res: Response) => {
  try {
    Logger.info('Testing database connection and model...');

    // Create a test settlement
    const testSettlement = new Settlement({
      settlementId: `test_${Date.now()}`,
      playerId: 'test_player_123',
      amount: 100.50,
      currency: 'THB',
      description: 'Test settlement for database initialization'
    });

    await testSettlement.save();
    Logger.success('Test settlement created', { id: testSettlement.settlementId });

    res.status(200).json({
      success: true,
      message: 'Database test successful - birdie_settlements database should now exist',
      data: {
        settlementId: testSettlement.settlementId,
        createdAt: testSettlement.createdAt
      }
    });
  } catch (error) {
    Logger.error('Database test failed', error);
    res.status(500).json({
      success: false,
      message: 'Database test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use(errorHandler);

// Database connection
connectSettlementDB();


// Initialize RabbitMQ connection
const rabbitMQPublisher = new RabbitMQPublisher();

// Connect to RabbitMQ on startup to create queues
rabbitMQPublisher.connect().then(() => {
  Logger.success('RabbitMQ initialized successfully on startup');

  // Test publish a message
  const testMessage = {
    player_id: 'test-player-startup',
    amount: 100,
    currency: 'THB',
    event_id: 'test-event-startup',
    description: 'Test message from settlement service startup',
    metadata: {
      court_fee: '50',
      shuttlecock_fee: '30',
      penalty_fee: '20',
      hours_played: '1',
      settlement_type: 'test',
      event_creator_phone: ''
    }
  };

  rabbitMQPublisher.publishPaymentCharge(testMessage).then((result) => {
    Logger.success('Test message published successfully', result);
  }).catch((error) => {
    Logger.error('Failed to publish test message', error);
  });
}).catch(error => {
  Logger.error('Failed to initialize RabbitMQ connection', error);
});

// Start HTTP server
const server = app.listen(BASE_PORT, () => {
  Logger.displayBanner();
  Logger.server(`Settlement Service HTTP server running on port ${BASE_PORT}`, {
    port: BASE_PORT,
    endpoints: {
      health: `/health`,
      settlements: `/api/settlements`
    }
  });
  Logger.info(`Health check available at: http://localhost:${BASE_PORT}/health`);
  Logger.info(`Settlement API available at: http://localhost:${BASE_PORT}/api/settlements`);
  Logger.info(`📘 API Documentation: http://localhost:${BASE_PORT}/api-docs`);
  Logger.info(`🐰 RabbitMQ URL: ${process.env.RABBIT_URL || 'amqp://admin:password123@localhost:5672'}`);
  Logger.info(`🐰 RabbitMQ Exchange: ${process.env.RABBIT_EXCHANGE || 'events'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  Logger.info('SIGTERM received, shutting down gracefully');

  server.close(() => {
    Logger.info('HTTP server closed');
  });

  try {
    await rabbitMQPublisher.close();
    Logger.info('RabbitMQ connection closed');
  } catch (error) {
    Logger.error('Error closing RabbitMQ connection', error);
  }

  process.exit(0);
});

process.on('SIGINT', async () => {
  Logger.info('SIGINT received, shutting down gracefully');

  server.close(() => {
    Logger.info('HTTP server closed');
  });

  try {
    await rabbitMQPublisher.close();
    Logger.info('RabbitMQ connection closed');
  } catch (error) {
    Logger.error('Error closing RabbitMQ connection', error);
  }

  process.exit(0);
});

export default app;