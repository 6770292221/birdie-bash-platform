import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import amqplib from "amqplib";
import swaggerUi from "swagger-ui-express";
import { bootQueue } from "./queue";
import { broadcastByEventId } from "./services/notify";
import { EventMessage } from "./types";
import { fetchEventById } from "./remote/eventApi";
import User from "./models/User";

const app = express();
app.use(express.json());

// ---- Swagger spec (object ล้วน) ----
const swaggerSpec = {
  openapi: "3.0.0",
  info: { title: "Badminton Notification API", version: "1.1.1" },
  paths: {
    "/test/publish": {
      post: {
        summary: "Publish EventMessage to RabbitMQ (routing key: event.created|event.updated)",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/EventMessage" } }
          }
        },
        responses: {
          "200": { description: "published" },
          "400": { description: "invalid payload" }
        }
      }
    },
    "/test/broadcast/{eventId}/{type}": {
      post: {
        summary: "Broadcast by eventId (fetch event detail) to all users (role=user)",
        parameters: [
          { in: "path", name: "eventId", required: true, schema: { type: "string" } },
          { in: "path", name: "type", required: true, schema: { type: "string", enum: ["created","updated","deleted"] } }
        ],
        responses: {
          "200": { description: "Broadcast result", content: { "application/json": { schema: { $ref: "#/components/schemas/BroadcastResult" } } } },
          "400": { description: "invalid params" }
        }
      }
    },
    "/diag/event/{id}": {
      get: {
        summary: "Fetch event detail (diagnostic)",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "ok" }, "500": { description: "error" } }
      }
    },
    "/diag/people/count": {
      get: {
        summary: "Count users with role=user (diagnostic)",
        responses: { "200": { description: "ok" } }
      }
    },
    "/health": { get: { summary: "health", responses: { "200": { description: "ok" } } } }
  },
  components: {
    schemas: {
      EventMessage: {
        type: "object",
        required: ["eventType","data","timestamp","service"],
        properties: {
          eventType: { type: "string", enum: ["created", "updated", "deleted"] },
          service: { type: "string", enum: ["event-service"] },
          timestamp: { type: "string", format: "date-time" },
          data: {
            type: "object",
            required: ["eventId"],
            additionalProperties: true,
            properties: {
              eventId: { type: "string" },
              eventName: { type: "string" },
              eventDate: { type: "string" },
              location: { type: "string" },
              venue: { type: "string" },
              createdBy: { type: "string" },
              updatedBy: { type: "string" }
            }
          }
        }
      },
      BroadcastResult: {
        type: "object",
        properties: {
          emails: { type: "number" },
          sms: { type: "number" },
          people: { type: "number" },
          dryRun: { type: "boolean" }
        }
      }
    }
  }
};
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ---------- Helpers ----------
function errInfo(e: any) {
  const ax = e?.response ? {
    status: e.response.status,
    data: e.response.data,
    url: e.config?.url,
    method: e.config?.method
  } : undefined;
  return {
    name: e?.name,
    message: e?.message,
    axios: ax,
    // บางทีอยากดู stack ด้วย แต่ในโปรดักชันอย่าเปิด
    stack: process.env.NODE_ENV === "production" ? undefined : e?.stack
  };
}

// ---------- Routes ----------

// Publish event ไป RabbitMQ
app.post("/test/publish", async (req, res) => {
  try {
    const msg: EventMessage = req.body;
    if (!msg?.eventType || !["created","updated"].includes(msg.eventType)
      || msg?.service !== "event-service" || !msg?.data?.eventId) {
      return res.status(400).json({ ok:false, error:"Invalid payload: require eventType(created|updated), service=event-service, data.eventId" });
    }

    const conn = await amqplib.connect(process.env.RABBIT_URL!);
    const ch = await conn.createChannel();
    const ex = process.env.RABBIT_EXCHANGE || "events";
    await ch.assertExchange(ex, "topic", { durable: true });
    const routingKey = msg.eventType === "created" ? "event.created" : "event.updated";
    ch.publish(ex, routingKey, Buffer.from(JSON.stringify(msg)), { persistent: true });
    await ch.close(); await conn.close();

    res.json({ ok:true, routingKey });
  } catch (e:any) {
    console.error("publish error:", errInfo(e));
    res.status(500).json({ ok:false, error: errInfo(e) });
  }
});

// ยิง broadcast โดยตรง
app.post("/test/broadcast/:eventId/:type", async (req, res) => {
  try {
    const { eventId, type } = req.params as { eventId: string; type: "created"|"updated" };
    if (!eventId || !["created","updated"].includes(type)) {
      return res.status(400).json({ ok:false, error:"Invalid params" });
    }
    const result = await broadcastByEventId(eventId, type);
    res.json(result);
  } catch (e:any) {
    console.error("broadcast error:", errInfo(e));
    res.status(500).json({ ok:false, error: errInfo(e) });
  }
});

// Diagnostics
app.get("/diag/event/:id", async (req, res) => {
  try {
    const event = await fetchEventById(req.params.id);
    res.json({ ok:true, event });
  } catch (e:any) {
    console.error("diag event error:", errInfo(e));
    res.status(500).json({ ok:false, error: errInfo(e) });
  }
});
app.get("/diag/people/count", async (_req, res) => {
  try {
    const count = await User.countDocuments({ role: "user" });
    res.json({ ok:true, count });
  } catch (e:any) {
    console.error("diag people error:", errInfo(e));
    res.status(500).json({ ok:false, error: errInfo(e) });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

// ---------- Boot ----------
(async () => {
  try {
    // รองรับทั้ง MONGODB_URI และ MONGO_URI
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (mongoUri) {
      await mongoose.connect(mongoUri);
      console.log("Mongo connected:", mongoUri);
    } else {
      console.warn("Mongo not connected: please set MONGODB_URI or MONGO_URI");
    }

    console.log("[server] booting queue with RABBIT_URL =", process.env.RABBIT_URL);
    await bootQueue();
  } catch (e) {
    console.error("boot error:", errInfo(e));
  }

  const port = Number(process.env.PORT || 3007);
  app.listen(port, () => console.log(`HTTP on :${port}  → /api-docs`));
})();
