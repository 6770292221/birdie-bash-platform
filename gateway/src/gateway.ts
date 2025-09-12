import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import http from "http";
import https from "https";
import { URL } from "url";

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
// Aggregated API Docs JSON endpoint
function fetchJson(targetUrl: string, timeoutMs = 2500): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(targetUrl);
      const lib = u.protocol === "https:" ? https : http;
      const req = lib.request(
        {
          method: "GET",
          hostname: u.hostname,
          port: u.port || (u.protocol === "https:" ? 443 : 80),
          path: u.pathname + (u.search || ""),
          timeout: timeoutMs,
          headers: { Accept: "application/json" },
        },
        (res) => {
          if ((res.statusCode || 0) >= 400) {
            reject(new Error(`HTTP ${res.statusCode} ${targetUrl}`));
            return;
          }
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            try {
              const body = Buffer.concat(chunks).toString("utf8");
              resolve(JSON.parse(body));
            } catch (e) {
              reject(e);
            }
          });
        }
      );
      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy(new Error("Request timeout"));
      });
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

function mergeOpenApi(specs: any[], baseServerUrl: string) {
  const merged: any = {
    openapi: "3.0.0",
    info: {
      title: "Gateway Birdie API",
      version: "1.0.0",
      description:
        "Aggregated API docs for Auth and Event services via Gateway",
    },
    servers: [{ url: baseServerUrl }],
    security: [{ BearerAuth: [] }],
    tags: [],
    paths: {},
    components: { securitySchemes: {}, schemas: {} },
  };

  const tagNames = new Set<string>();

  for (const spec of specs) {
    // tags
    if (Array.isArray(spec.tags)) {
      for (const t of spec.tags) {
        if (t && t.name && !tagNames.has(t.name)) {
          tagNames.add(t.name);
          merged.tags.push(t);
        }
      }
    }
    // paths (shallow merge; later specs override if same path/method)
    if (spec.paths && typeof spec.paths === "object") {
      merged.paths = { ...merged.paths, ...spec.paths };
    }
    // components.securitySchemes (prefer existing if same key)
    const ss = spec.components?.securitySchemes || {};
    for (const k of Object.keys(ss)) {
      if (!merged.components.securitySchemes[k]) {
        merged.components.securitySchemes[k] = ss[k];
      }
    }
    // components.schemas (later wins to simplify; both services share Error/BearerAuth compatible)
    const sch = spec.components?.schemas || {};
    merged.components.schemas = { ...merged.components.schemas, ...sch };
  }

  return merged;
}

function buildGatewaySpec() {
  return {
    openapi: "3.0.0",
    security: [{ BearerAuth: [] }],
    tags: [
      { name: "Gateway", description: "Gateway utilities and health" },
      {
        name: "Authentication",
        description:
          "JWT is validated at gateway; user context forwarded via x-user-* headers",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        GatewayError: {
          type: "object",
          properties: {
            error: { type: "string" },
            code: { type: "string" },
          },
        },
      },
    },
    paths: {
      "/health": {
        get: {
          summary: "Gateway health check",
          tags: ["Gateway"],
          responses: {
            200: {
              description: "Service is healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string" },
                      timestamp: { type: "string", format: "date-time" },
                      service: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

app.get("/api-docs.json", async (req, res) => {
  const proto =
    (req.headers["x-forwarded-proto"] as string) || req.protocol || "http";
  const host = req.headers.host || `localhost:${BASE_PORT}`;
  const baseUrl = `${proto}://${host}`;
  try {
    const [authSpec, eventSpec] = await Promise.allSettled([
      fetchJson(`${AUTH_SERVICE_URL}/api-docs.json`),
      fetchJson(`${EVENT_SERVICE_URL}/api-docs.json`),
    ]);

    const specs: any[] = [buildGatewaySpec()];
    if (authSpec.status === "fulfilled") specs.push(authSpec.value);
    if (eventSpec.status === "fulfilled") specs.push(eventSpec.value);

    if (specs.length === 0) {
      res.status(503).json({
        error: "Failed to load upstream API docs",
        services: [AUTH_SERVICE_URL, EVENT_SERVICE_URL],
      });
      return;
    }

    const merged = mergeOpenApi(specs, baseUrl);
    res.json(merged);
  } catch (e: any) {
    console.error("[GATEWAY] Failed to merge API docs:", e?.message || e);
    res.status(500).json({ error: "Failed to merge API docs" });
  }
});

// Swagger UI pointing to aggregated JSON
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(undefined, { swaggerOptions: { url: "/api-docs.json", persistAuthorization: true } })
);

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
    protected: true, // Require auth for all /api/events routes
  },
];

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
    onProxyReq: (proxyReq: any, req: any, res: any) => {
      console.log(
        `[GATEWAY] ${req.method} ${req.path} -> ${route.target}${req.path}`
      );

      // Add user headers if authenticated
      if (req.headers["x-user-id"]) {
        proxyReq.setHeader("x-user-id", req.headers["x-user-id"]);
        proxyReq.setHeader("x-user-email", req.headers["x-user-email"]);
        proxyReq.setHeader("x-user-role", req.headers["x-user-role"]);
        proxyReq.setHeader("x-authenticated", "true");
      }

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
    onProxyRes: (proxyRes: any, req: any, res: any) => {
      // Optionally log upstream status codes
      console.log(
        `[GATEWAY] <- ${proxyRes.statusCode} ${route.target}${req.path}`
      );
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

// (Removed) Method-specific protection, now all /api/events require auth via route.protected

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
