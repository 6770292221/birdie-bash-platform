import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import dotenv from "dotenv";
import cors from "cors";
import { attachUserFromJwt, requireAuth, requireAdmin, forwardUserHeaders } from "./middleware/auth";
import { getRoutes } from "./routesConfig";
import { registerDocs } from "./docs/aggregate";

dotenv.config();

const app = express();
const BASE_PORT = Number(process.env.PORT) || 8080;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
if (!process.env.JWT_SECRET) {
  console.warn("[Gateway] JWT_SECRET not set; using default development secret. Set gateway/.env");
}

// Microservice URLs
const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || "http://localhost:3001";
const EVENT_SERVICE_URL =
  process.env.EVENT_SERVICE_URL || "http://localhost:3002";
const REGISTRATION_SERVICE_URL =
  process.env.REGISTRATION_SERVICE_URL || "http://localhost:3005";

app.use(cors());
app.use(express.json());
app.use(attachUserFromJwt(JWT_SECRET));

// Docs aggregator (Swagger UI + merged JSON)
registerDocs(app, AUTH_SERVICE_URL, EVENT_SERVICE_URL, REGISTRATION_SERVICE_URL);

// Authentication middleware is now in ./middleware/auth

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
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "birdie-gateway",
  });
});

// Routes configuration
const routes = getRoutes(AUTH_SERVICE_URL, EVENT_SERVICE_URL, REGISTRATION_SERVICE_URL);

// Setup proxies for each service
routes.forEach((route) => {
  const proxyOptions = {
    target: route.target,
    changeOrigin: true,
    timeout: 5000,
    proxyTimeout: 5000,
    pathRewrite: {
      [`^${route.path}`]: route.path, // Keep the path when forwarding
    },
    onProxyReq: (proxyReq: any, req: any, _res: any) => {
      console.log(
        `[GATEWAY] ${req.method} ${req.path} -> ${route.target}${req.path}`
      );

      // Add user headers if authenticated
      forwardUserHeaders(proxyReq, req as any);

      // If body was parsed by express.json(), re-stream it to the target
      if (
        req.body &&
        Object.keys(req.body).length &&
        req.method !== "GET" &&
        req.headers["content-type"]?.includes("application/json")
      ) {
        const bodyData = Buffer.from(JSON.stringify(req.body));
        proxyReq.setHeader("Content-Type", "application/json");
        proxyReq.setHeader("Content-Length", bodyData.length);
        proxyReq.write(bodyData);
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
    onProxyRes: (proxyRes: any, req: any, _res: any) => {
      // Optionally log upstream status codes
      console.log(
        `[GATEWAY] <- ${proxyRes.statusCode} ${route.target}${req.path}`
      );
    },
  };

  // Create middleware stack based on route configuration
  const middlewares: any[] = [];
  
  if (route.protected) {
    middlewares.push(requireAuth as any);
  }
  
  if (route.adminRequired) {
    middlewares.push(requireAdmin as any);
  }
  
  middlewares.push(createProxyMiddleware(proxyOptions));

  // Apply route with method filtering if specified
  if (route.methods && route.methods.length > 0) {
    route.methods.forEach(method => {
      switch (method.toUpperCase()) {
        case "GET":
          app.get(route.path, ...middlewares);
          break;
        case "POST":
          app.post(route.path, ...middlewares);
          break;
        case "PUT":
          app.put(route.path, ...middlewares);
          break;
        case "DELETE":
          app.delete(route.path, ...middlewares);
          break;
        case "PATCH":
          app.patch(route.path, ...middlewares);
          break;
        default:
          app.use(route.path, ...middlewares);
      }
    });
  } else {
    app.use(route.path, ...middlewares);
  }
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
app.use((err: any, _req: any, res: any, _next: any) => {
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
    console.log(` ✅ Registration Service: ${REGISTRATION_SERVICE_URL}`);
    console.log(` 📘 Gateway docs: http://localhost:${port}/api-docs`);
  });

  server.on("error", (err: any) => {
    if (err && err.code === "EADDRINUSE" && attempt < 10) {
      const nextPort = port + 1;
      console.warn(
        `[Gateway] Port ${port} in use. Retrying on ${nextPort} (attempt ${
          attempt + 1
        }/10)...`
      );
      setTimeout(() => startGateway(nextPort, attempt + 1), 200);
    } else {
      console.error("[Gateway] Failed to bind port:", err);
      process.exit(1);
    }
  });
}

startGateway(BASE_PORT);
