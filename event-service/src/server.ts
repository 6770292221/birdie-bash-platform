import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerSpecs from "./config/swagger";
import { connectEventDB } from "./config/eventDatabase";
import {
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  getEventStatus,
} from "./controllers/eventController";

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

// Real event endpoints backed by MongoDB
app.get("/api/events", getEvents);
app.post("/api/events", createEvent);
app.get("/api/events/:id", getEvent);
app.patch("/api/events/:id", updateEvent);
app.delete("/api/events/:id", deleteEvent);
app.get("/api/events/:id/status", getEventStatus);

// Initialize DB connection (non-blocking)
connectEventDB();

function startEventService(port: number, attempt = 0) {
  const server = app.listen(port, () => {
    console.log(`📅 Event Service running on port ${port}`);
    console.log(`📘 Event API docs: http://localhost:${port}/api-docs`);
  });

  server.on("error", (err: any) => {
    if (err && err.code === "EADDRINUSE" && attempt < 10) {
      const nextPort = port + 1;
      console.warn(
        `[Event] Port ${port} in use. Retrying on ${nextPort} (attempt ${
          attempt + 1
        }/10)...`
      );
      setTimeout(() => startEventService(nextPort, attempt + 1), 200);
    } else {
      console.error("[Event] Failed to bind port:", err);
      process.exit(1);
    }
  });
}

startEventService(BASE_PORT);
