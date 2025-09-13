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
import { registerPlayer, getPlayers, cancelPlayerRegistration } from "./controllers/playerController";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// API Docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
app.get('/api-docs.json', (_req: Request, res: Response) => {
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
app.get("/api/events/:id/players", getPlayers);
app.post("/api/events/:id/players", registerPlayer);
app.post("/api/events/:id/players/:pid/cancel", cancelPlayerRegistration);

// Initialize DB connection (non-blocking)
connectEventDB();

app.listen(PORT, () => {
  console.log(`📅 Event Service running on port ${PORT}`);
  console.log(`📘 Event API docs: http://localhost:${PORT}/api-docs`);
});
