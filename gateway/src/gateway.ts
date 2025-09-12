import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerSpecs from "./config/swagger";

dotenv.config();

const app = express();
const BASE_PORT = Number(process.env.PORT) || 8080;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Microservice URLs
const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || "http://localhost:3001";
const EVENT_SERVICE_URL =
  process.env.EVENT_SERVICE_URL || "http://localhost:3002";

app.use(cors());
app.use(express.json());

// API Docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Authentication middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // For non-protected routes, continue without user info
    next();
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Add user information to headers for downstream services
    req.headers["x-user-id"] = decoded.userId;
    req.headers["x-user-email"] = decoded.email;
    req.headers["x-user-role"] = decoded.role;
    req.headers["x-authenticated"] = "true";

    next();
  } catch (error) {
    console.error("Gateway auth error:", error);
    res.status(401).json({
      error: "Invalid token",
      code: "UNAUTHORIZED",
    });
  }
};

// Require authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.headers["x-authenticated"]) {
    res.status(401).json({
      error: "Authentication required",
      code: "AUTHENTICATION_REQUIRED",
    });
    return;
  }
  next();
};

// Health check
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Gateway health check
 *     tags: [Gateway]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 service:
 *                   type: string
 *                   example: birdie-gateway
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "birdie-gateway",
  });
});

// Routes configuration
const routes = [
  // Auth Service - no auth required for login/register
  {
    path: "/api/auth",
    target: AUTH_SERVICE_URL,
    protected: false,
  },
  // Event Service - some routes protected
  {
    path: "/api/events",
    target: EVENT_SERVICE_URL,
    protected: false, // We'll handle protection per method in the proxy
  },
];

// Setup proxies for each service
routes.forEach((route) => {
  const proxyOptions = {
    target: route.target,
    changeOrigin: true,
    pathRewrite: {
      [`^${route.path}`]: route.path, // Keep the path when forwarding
    },
    onProxyReq: (proxyReq: any, req: any, res: any) => {
      console.log(
        `[GATEWAY] ${req.method} ${req.path} -> ${route.target}${req.path}`
      );

      // Add user headers if authenticated
      if (req.headers["x-user-id"]) {
        proxyReq.setHeader("x-user-id", req.headers["x-user-id"]);
        proxyReq.setHeader("x-user-email", req.headers["x-user-email"]);
        proxyReq.setHeader("x-user-role", req.headers["x-user-role"]);
      }
    },
    onError: (err: any, req: any, res: any) => {
      console.error(
        `[GATEWAY ERROR] Failed to proxy ${req.path}:`,
        err.message
      );
      res.status(503).json({
        error: "Service temporarily unavailable",
        code: "SERVICE_UNAVAILABLE",
        service: route.target,
      });
    },
  };

  if (route.protected) {
    app.use(
      route.path,
      authenticateToken,
      requireAuth,
      createProxyMiddleware(proxyOptions)
    );
  } else {
    app.use(route.path, authenticateToken, createProxyMiddleware(proxyOptions));
  }
});

// Protected event routes (specific methods)
app.use("/api/events", authenticateToken, (req: any, res: any, next: any) => {
  const protectedMethods = ["POST", "PUT", "DELETE"];

  if (
    protectedMethods.includes(req.method) &&
    !req.headers["x-authenticated"]
  ) {
    res.status(401).json({
      error: "Authentication required for this operation",
      code: "AUTHENTICATION_REQUIRED",
    });
    return;
  }

  next();
});

// Catch all for undefined routes
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    code: "ROUTE_NOT_FOUND",
    path: req.path,
  });
});

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("[GATEWAY ERROR]:", err);
  res.status(500).json({
    error: "Internal gateway error",
    code: "INTERNAL_ERROR",
  });
});

function startGateway(port: number, attempt = 0) {
  const server = app.listen(port, () => {
    console.log(`API Gateway running on port ${port}`);
    console.log("Service endpoints:");
    console.log(` ✅ Auth Service: ${AUTH_SERVICE_URL}`);
    console.log(` ✅ Event Service: ${EVENT_SERVICE_URL}`);
    console.log(` 📘 Gateway docs: http://localhost:${port}/api-docs`);
  });

  server.on("error", (err: any) => {
    if (err && err.code === "EADDRINUSE" && attempt < 10) {
      const nextPort = port + 1;
      console.warn(
        `[Gateway] Port ${port} in use. Retrying on ${nextPort} (attempt ${attempt + 1}/10)...`
      );
      setTimeout(() => startGateway(nextPort, attempt + 1), 200);
    } else {
      console.error("[Gateway] Failed to bind port:", err);
      process.exit(1);
    }
  });
}

startGateway(BASE_PORT);
