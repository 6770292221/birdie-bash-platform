import amqplib, { ConsumeMessage, Connection, Channel } from "amqplib";
import ProcessedEvent from "../models/ProcessedEvent";
import EventThrottle from "../models/EventThrottle";
import {
  broadcastByEventId,
  broadcastParticipantJoined,
  broadcastParticipantCancelled,
  broadcastPaymentPending,
  broadcastPaymentCompleted,
} from "../services/notify";

declare global {
  // กัน start ซ้อนตอน hot-reload เท่านั้น
  // @ts-ignore
  var __BBP_CONSUMER_STARTED__: boolean | undefined;
}

// รองรับ event จาก event-service และ registration-service
type EventKind = "created" | "updated" | "deleted" | "participant.joined" | "participant.cancelled";

// ตรวจ throttle แบบ atomic ด้วย updateOne + filter เงื่อนไขเวลา
async function passThrottle(key: string): Promise<boolean> {
  const minMs = Number(process.env.CONSUME_MIN_INTERVAL_MS || 60_000); // 60 วิ
  const now = new Date();
  const nextAllowedAt = new Date(now.getTime() + minMs);

  const throttleTtlSec = Number(process.env.THROTTLE_TTL_SECONDS || 30 * 24 * 60 * 60); // 30 วัน
  const expireAt = new Date(now.getTime() + throttleTtlSec * 1000);

  const res = await EventThrottle.updateOne(
    { key, $or: [{ nextAllowedAt: { $lte: now } }, { nextAllowedAt: { $exists: false } }] },
    { $set: { key, nextAllowedAt, expireAt } },
    { upsert: true }
  );
  return (res.upsertedCount || res.matchedCount) > 0;
}

export async function startNotificationConsumer() {
  if ((global as any).__BBP_CONSUMER_STARTED__) {
    console.log("consumer already started (guard)");
    return;
  }
  (global as any).__BBP_CONSUMER_STARTED__ = true;

  const ex  = process.env.RABBIT_EXCHANGE || "events";
  const q   = process.env.RABBIT_QUEUE    || "events.notification";
  const key = process.env.RABBIT_BIND_KEY || "event.#";
  const retryMs = Number(process.env.CONSUMER_RETRY_MS || 5000);

  const paymentQueue = process.env.PAYMENT_QUEUE || "payment.completed"; // << คิวสำหรับ payment

  const rawUrl = (process.env.RABBIT_URL || "amqp://guest:guest@127.0.0.1:5672").trim();
  const urls = [rawUrl, rawUrl.includes("localhost") ? rawUrl.replace("localhost", "127.0.0.1") : ""].filter(Boolean);

  async function connectOnce(): Promise<Connection> {
    let lastErr: any;
    for (const u of urls) {
      try {
        console.log("[rabbit] trying", u);
        const conn = await amqplib.connect(u, { heartbeat: 10 });
        console.log("[rabbit] connected", u);
        return conn;
      } catch (e: any) {
        lastErr = e;
        console.error("[rabbit] connect fail:", e?.code || e?.message || e);
      }
    }
    throw lastErr;
  }

  async function startLoop() {
    for (;;) {
      let conn: Connection | undefined;
      let ch: Channel | undefined;
      try {
        conn = await connectOnce();

        conn.on("error", (e) => console.error("[rabbit] conn error:", e?.message || e));
        conn.on("close", () => {
          console.warn("[rabbit] conn closed. Reconnecting in", retryMs, "ms");
          setTimeout(startLoop, retryMs);
        });

        ch = await conn.createChannel();

        // ====== Consumer 1: event/participant.* ======
        await ch.assertExchange(ex, "topic", { durable: true });
        await ch.assertQueue(q, { durable: true });
        await ch.bindQueue(q, ex, key);
        ch.prefetch(2);
        console.log(`[rabbit] bound queue=${q} → exchange=${ex} key=${key}`);

        await ch.consume(
          q,
          async (msg: ConsumeMessage | null) => {
            if (!msg) return;
            const safeAck = () => { try { ch!.ack(msg); } catch {} };
            const safeRequeue = () => { try { ch!.nack(msg, false, true); } catch {} };

            try {
              const payload = JSON.parse(msg.content.toString());
              const type = payload?.eventType as EventKind | undefined;

              if (!type) { console.warn("[consume] invalid payload (no type)", payload); return safeAck(); }

              const isEvent      = type === "created" || type === "updated" || type === "deleted";
              const isJoined     = type === "participant.joined";
              const isCancelled  = type === "participant.cancelled";

              const eid  = payload?.data?.eventId as string | undefined;
              const pid  = payload?.data?.playerId as string | undefined;

              if (isEvent && !eid) { console.warn("[consume] missing eventId", payload); return safeAck(); }
              if ((isJoined || isCancelled) && (!eid || !pid)) {
                console.warn("[consume] missing eventId/playerId for participant.*", payload); return safeAck();
              }

              const dedupeKey =
                isEvent     ? `${type}:${eid}` :
                isJoined    ? `participant.joined:${eid}:${pid}` :
                              `participant.cancelled:${eid}:${pid}`;

              const allowed = await passThrottle(dedupeKey);
              if (!allowed) { console.log("[throttle] skip", dedupeKey); return safeAck(); }

              const ttlSec = Number(process.env.DEDUP_TTL_SECONDS || 7 * 24 * 60 * 60);
              const now = new Date();
              const expireAt = new Date(now.getTime() + ttlSec * 1000);
              try {
                await ProcessedEvent.create({ key: dedupeKey, createdAt: now, expireAt });
              } catch (e: any) {
                if (e?.code === 11000) { console.log("[idempotent] skip", dedupeKey); return safeAck(); }
                throw e;
              }

              const result =
                isJoined    ? await broadcastParticipantJoined(payload) :
                isCancelled ? await broadcastParticipantCancelled(payload) :
                              await broadcastByEventId(eid!, type);
              console.log("[consume] broadcast result:", result);
              return safeAck();

            } catch (err) {
              console.error("[consume] error, will requeue:", err);
              try {
                const payload = JSON.parse(msg.content.toString());
                const type = payload?.eventType as string | undefined;
                const eid  = payload?.data?.eventId as string | undefined;
                const pid  = payload?.data?.playerId as string | undefined;
                const k =
                  type === "created" || type === "updated" || type === "deleted"
                    ? `${type}:${eid}`
                    : type === "participant.joined"
                      ? `participant.joined:${eid}:${pid}`
                      : type === "participant.cancelled"
                        ? `participant.cancelled:${eid}:${pid}`
                        : "";
                if (k) await ProcessedEvent.deleteOne({ key: k });
              } catch {}
              return safeRequeue();
            }
          },
          { noAck: false }
        );

        // ====== Consumer 2: payment queue (direct queue) ======
        await ch.assertQueue(paymentQueue, { durable: true });
        console.log(`[rabbit] consuming payment queue=${paymentQueue}`);

        await ch.consume(
          paymentQueue,
          async (msg: ConsumeMessage | null) => {
            if (!msg) return;
            const safeAck = () => { try { ch!.ack(msg); } catch {} };
            const safeRequeue = () => { try { ch!.nack(msg, false, true); } catch {} };

            try {
              const payload = JSON.parse(msg.content.toString());
              const paymentId = String(payload?.payment_id || "");
              const eventId   = String(payload?.event_id || "");
              const playerId  = String(payload?.player_id || "");
              const status    = String(payload?.payment_status || "").toUpperCase();

              if (!paymentId || !eventId || !playerId || !status) {
                console.warn("[payment] invalid message:", payload);
                return safeAck();
              }

              const dedupeKey = `payment:${paymentId}:${status}`;

              const allowed = await passThrottle(dedupeKey);
              if (!allowed) { console.log("[throttle] skip", dedupeKey); return safeAck(); }

              const ttlSec = Number(process.env.DEDUP_TTL_SECONDS || 7 * 24 * 60 * 60);
              const now = new Date();
              const expireAt = new Date(now.getTime() + ttlSec * 1000);
              try {
                await ProcessedEvent.create({ key: dedupeKey, createdAt: now, expireAt });
              } catch (e: any) {
                if (e?.code === 11000) { console.log("[idempotent] skip", dedupeKey); return safeAck(); }
                throw e;
              }

              let result: any;
              if (status === "PENDING") {
                result = await broadcastPaymentPending(payload);
              } else if (status === "COMPLETED") {
                result = await broadcastPaymentCompleted(payload);
              } else {
                console.log("[payment] unsupported status:", status);
                result = { ignored: true, status };
              }

              console.log("[payment] broadcast result:", result);
              return safeAck();

            } catch (err) {
              console.error("[payment] error, will requeue:", err);
              try {
                const payload = JSON.parse(msg.content.toString());
                const paymentId = String(payload?.payment_id || "");
                const status    = String(payload?.payment_status || "").toUpperCase();
                const k = paymentId && status ? `payment:${paymentId}:${status}` : "";
                if (k) await ProcessedEvent.deleteOne({ key: k });
              } catch {}
              return safeRequeue();
            }
          },
          { noAck: false }
        );

        console.log("notification-consumer ready.");
        return; // ให้ on('close') จัดการ reconnect
      } catch (e: any) {
        console.error("[consumer] start failed:", e?.code || e?.message || e);
        try { await ch?.close(); } catch {}
        try { await conn?.close(); } catch {}
        console.log(`[consumer] retry in ${retryMs}ms`);
        await new Promise((r) => setTimeout(r, retryMs));
      }
    }
  }

  startLoop();
}
