import express, { Request, Response } from "express";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerSpecs from "./config/swagger";
import { connectRegistrationDB } from "./config/registrationDatabase";
import { registerMember, registerGuest, getPlayers, cancelPlayerRegistration } from "./controllers/registrationController";

// Ensure service-specific .env is loaded regardless of CWD
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
const BASE_PORT = Number(process.env.PORT) || 3005;

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
    service: "registration-service",
  });
});

// Middleware to extract user info from gateway headers
app.use((req: any, res: Response, next: any) => {
  if (req.headers["x-user-id"]) {
    req.user = {
      userId: req.headers["x-user-id"],
      email: req.headers["x-user-email"],
      role: req.headers["x-user-role"],
    };
  }
  next();
});

// Registration endpoints (namespaced under /api/registration)
app.get("/api/registration/events/:id/players", getPlayers);
app.post("/api/registration/events/:id/members", registerMember);
app.post("/api/registration/events/:id/member", registerMember);
app.post("/api/registration/events/:id/guests", registerGuest);
app.post("/api/registration/events/:id/players/:pid/cancel", cancelPlayerRegistration);

// Initialize DB connection
connectRegistrationDB();

function startService(port: number, attempt = 0) {
  const server = app.listen(port, () => {
    console.log(`📝 Registration Service running on port ${port}`);
    console.log(`📘 Registration API docs: http://localhost:${port}/api-docs`);
  });

  server.on("error", (err: any) => {
    if (err && err.code === "EADDRINUSE" && attempt < 10) {
      const nextPort = port + 1;
      console.warn(
        `[Registration] Port ${port} in use. Retrying on ${nextPort} (attempt ${attempt + 1}/10)...`
      );
      setTimeout(() => startService(nextPort, attempt + 1), 200);
    } else {
      console.error("[Registration] Failed to bind port:", err);
      process.exit(1);
    }
  });
}

startService(BASE_PORT);
