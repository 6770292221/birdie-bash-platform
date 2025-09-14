import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectPaymentDB } from "./config/paymentDatabase";
import { errorHandler } from "./middleware/errorHandler";
import { startGrpcServer } from "./grpcServer";
import { Logger } from "./utils/logger";

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

// Error handling middleware
app.use(errorHandler);

// Database connection
connectPaymentDB();

// Start gRPC server
startGrpcServer();

// Start HTTP server (only for health checks)
app.listen(BASE_PORT, () => {
  Logger.server(`HTTP server running on port ${BASE_PORT} (health check only)`, {
    port: BASE_PORT,
    endpoint: `/health`
  });
  Logger.info(`Health check available at: http://localhost:${BASE_PORT}/health`);
});

export default app;