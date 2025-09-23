import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerSpecs from "./config/swagger";
import { connectEventDB } from "./config/eventDatabase";
import eventRoutes from "./routes/eventRoutes";

dotenv.config();

const app = express();
const BASE_PORT = Number(process.env.PORT) || 3002;

app.use(cors());
app.use(express.json());

// API Docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
app.get("/api-docs.json", (_req: Request, res: Response) => {
  res.json(swaggerSpecs);
});

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "event-service",
  });
});

// Middleware to extract user info from gateway headers
app.use((req: any, res: Response, next: any) => {
  // Extract user info from headers set by gateway
  if (req.headers["x-user-id"]) {
    req.user = {
      userId: req.headers["x-user-id"],
      email: req.headers["x-user-email"],
      role: req.headers["x-user-role"],
    };
  }
  next();
});

// Event endpoints (mounted router)
app.use("/api/events", eventRoutes);

// Initialize DB connection (non-blocking)
connectEventDB();

// Start capacity consumer (for auto-promotion)
const { spawn } = require('child_process');
const capacityWorker = spawn('npx', ['ts-node', 'src/consumers/capacityConsumer.ts'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: process.env,
});
console.log('🔄 Capacity Consumer started');

// Ensure worker is terminated with the server to avoid multiple consumers
const stopWorker = () => {
  try { capacityWorker.kill('SIGTERM'); } catch { /* noop */ }
};
process.on('exit', stopWorker);
process.on('SIGINT', () => { stopWorker(); process.exit(0); });
process.on('SIGTERM', () => { stopWorker(); process.exit(0); });
process.on('SIGHUP', () => { stopWorker(); process.exit(0); });

const server = app.listen(BASE_PORT, () => {
  console.log(`📅 Event Service running on port ${BASE_PORT}`);
  console.log(`📘 Event API docs: http://localhost:${BASE_PORT}/api-docs`);
});

server.on("error", (err: any) => {
  console.error(`[Event] Failed to start on port ${BASE_PORT}:`, err);
  process.exit(1);
});
