import http from "http";
import https from "https";
import { URL } from "url";
import swaggerUi from "swagger-ui-express";
import type { Express, Request, Response } from "express";

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

export function registerDocs(app: Express, authServiceUrl: string, eventServiceUrl: string) {
  app.get("/api-docs.json", async (req: Request, res: Response) => {
    const proto = (req.headers["x-forwarded-proto"] as string) || (req.protocol || "http");
    const host = req.headers.host || `localhost`;
    const baseUrl = `${proto}://${host}`;
    try {
      const [authSpec, eventSpec] = await Promise.allSettled([
        fetchJson(`${authServiceUrl}/api-docs.json`),
        fetchJson(`${eventServiceUrl}/api-docs.json`),
      ]);

      const specs: any[] = [buildGatewaySpec()];
      if (authSpec.status === "fulfilled") specs.push(authSpec.value);
      if (eventSpec.status === "fulfilled") specs.push(eventSpec.value);

      if (specs.length === 1) {
        res.status(503).json({
          error: "Failed to load upstream API docs",
          services: [authServiceUrl, eventServiceUrl],
        });
        return;
      }

      const merged = mergeOpenApi(specs, baseUrl);
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

