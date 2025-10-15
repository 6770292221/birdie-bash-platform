import http from "http";
import https from "https";
import { URL } from "url";
import swaggerUi from "swagger-ui-express";
import type { Express, Request, Response } from "express";
import { match } from "assert";

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
      description: "Aggregated API docs for Auth and Event services via Gateway",
    },
    servers: [{ url: baseServerUrl }],
    security: [{ BearerAuth: [] }],
    tags: [],
    paths: {},
    components: { securitySchemes: {}, schemas: {} },
  };

  const tagNames = new Set<string>();

  for (const spec of specs) {
    if (Array.isArray(spec.tags)) {
      for (const t of spec.tags) {
        if (t && t.name && !tagNames.has(t.name)) {
          tagNames.add(t.name);
          merged.tags.push(t);
        }
      }
    }
    if (spec.paths && typeof spec.paths === "object") {
      merged.paths = { ...merged.paths, ...spec.paths };
    }
    const ss = spec.components?.securitySchemes || {};
    for (const k of Object.keys(ss)) {
      if (!merged.components.securitySchemes[k]) {
        merged.components.securitySchemes[k] = ss[k];
      }
    }
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
      { name: "Payments", description: "Payment queries proxied via gRPC to payment-service" },
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
        PaymentStatus: {
          type: "string",
          description: "Payment status enum",
          enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"],
        },
        PaymentSummary: {
          type: "object",
          properties: {
            id: { type: "string" },
            status: { $ref: "#/components/schemas/PaymentStatus" },
            amount: { type: "number" },
            currency: { type: "string" },
            eventId: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        EventPaymentSummary: {
          type: "object",
          properties: {
            playerId: { type: "string" },
            amount: { type: "number" },
            status: { $ref: "#/components/schemas/PaymentStatus" },
          },
        },
        PlayerPaymentsResponse: {
          type: "object",
          properties: {
            payments: { type: "array", items: { $ref: "#/components/schemas/PaymentSummary" } },
          },
        },
        EventPaymentsResponse: {
          type: "object",
          properties: {
            payments: { type: "array", items: { $ref: "#/components/schemas/EventPaymentSummary" } },
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
      "/api/payments/player/{playerId}": {
        get: {
          summary: "Get payments for a player",
            description: "Returns payments for a player (optionally filtered by status/event). Backed by gRPC GetPlayerPayments.",
          tags: ["Payments"],
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "playerId",
              required: true,
              schema: { type: "string" },
            },
            {
              in: "query",
              name: "status",
              required: false,
              schema: { type: "string", enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"] },
              description: "Filter by payment status",
            },
            {
              in: "query",
              name: "eventId",
              required: false,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "List of payments",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PlayerPaymentsResponse" },
                },
              },
            },
            401: { description: "Unauthorized" },
            502: { description: "Upstream payment service error", content: { "application/json": { schema: { $ref: "#/components/schemas/GatewayError" } } } },
          },
        },
      },
      "/api/payments/event/{eventId}": {
        get: {
          summary: "Get payments for an event",
          description: "Returns aggregated payments for an event by player. Backed by gRPC GetEventPayments.",
          tags: ["Payments"],
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: "path", name: "eventId", required: true, schema: { type: "string" } },
            { in: "query", name: "status", required: false, schema: { type: "string", enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"] }, description: "Filter by payment status" },
          ],
          responses: {
            200: {
              description: "Event payments aggregated by player",
              content: { "application/json": { schema: { $ref: "#/components/schemas/EventPaymentsResponse" } } },
            },
            401: { description: "Unauthorized" },
            502: { description: "Upstream payment service error", content: { "application/json": { schema: { $ref: "#/components/schemas/GatewayError" } } } },
          },
        },
      },
    },
  };
}

export function registerDocs(
  app: Express,
  authServiceUrl: string,
  eventServiceUrl: string,
  registrationServiceUrl?: string,
  settlementServiceUrl?: string,
  matchingServiceUrl?: string
) {
  app.get("/api-docs.json", async (req: Request, res: Response) => {
    const proto = (req.headers["x-forwarded-proto"] as string) || (req.protocol || "http");
    const host = req.headers.host || `localhost`;
    const baseUrl = `${proto}://${host}`;
    try {
      const upstreams: Array<{ name: string; url: string }> = [];

      const appendUpstream = (name: string, baseUrl?: string) => {
        if (!baseUrl) return;
        const url = `${baseUrl.replace(/\/$/, "")}/api-docs.json`;
        if (upstreams.some((entry) => entry.url === url)) return;
        upstreams.push({ name, url });
      };

      appendUpstream('auth', authServiceUrl);
      appendUpstream('event', eventServiceUrl);
      appendUpstream('registration', registrationServiceUrl);
      appendUpstream('settlement', settlementServiceUrl);
      appendUpstream('matching', matchingServiceUrl);

      const results = await Promise.allSettled(upstreams.map(u => fetchJson(u.url)));

      const specs: any[] = [buildGatewaySpec()];
      const status: Record<string, { ok: boolean; url: string; error?: string }> = {};

      results.forEach((r, i) => {
        const u = upstreams[i];
        if (r.status === 'fulfilled') {
          specs.push(r.value);
          status[u.name] = { ok: true, url: u.url };
        } else {
          // eslint-disable-next-line no-console
          console.warn(`[GATEWAY] Failed to load ${u.name} API docs from ${u.url}:`, r.reason?.message || r.reason);
          status[u.name] = { ok: false, url: u.url, error: String(r.reason?.message || r.reason) };
        }
      });

      if (specs.length === 1) {
        res.status(503).json({
          error: "Failed to load upstream API docs",
          services: status,
        });
        return;
      }

      const merged = mergeOpenApi(specs, baseUrl);
      // Attach diagnostic info for visibility in Swagger UI (vendor extension)
      (merged as any)['x-upstreams'] = status;
      res.json(merged);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error("[GATEWAY] Failed to merge API docs:", e?.message || e);
      res.status(500).json({ error: "Failed to merge API docs" });
    }
  });

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(undefined, { swaggerOptions: { url: "/api-docs.json", persistAuthorization: true } })
  );
}
