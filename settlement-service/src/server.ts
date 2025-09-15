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


// Start HTTP server
app.listen(BASE_PORT, () => {
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
  Logger.grpc(`Connects to Payment Service gRPC at: localhost:${process.env.GRPC_PORT || '50051'}`);
});

export default app;