import amqplib, { ConsumeMessage, Connection, Channel } from "amqplib";
import ProcessedEvent from "../models/ProcessedEvent";
import EventThrottle from "../models/EventThrottle";
import { broadcastByEventId } from "../services/notify";

declare global {
  // กัน start ซ้อนตอน hot-reload เท่านั้น
  // @ts-ignore
  var __BBP_CONSUMER_STARTED__: boolean | undefined;
}

type EventKind = "created" | "updated" | "deleted";

// ตรวจ throttle แบบ atomic ด้วย updateOne + filter เงื่อนไขเวลา
async function passThrottle(key: string): Promise<boolean> {
  const minMs = Number(process.env.CONSUME_MIN_INTERVAL_MS || 60_000); // ค่าเริ่มต้น 60 วิ
  const now = new Date();
  const nextAllowedAt = new Date(now.getTime() + minMs);

  // เก็บเอกสารนี้ไว้นาน ๆ เท่ากับ THROTTLE_TTL_SECONDS (ล้างขยะอัตโนมัติ)
  const throttleTtlSec = Number(process.env.THROTTLE_TTL_SECONDS || 30 * 24 * 60 * 60); // 30 วัน
  const expireAt = new Date(now.getTime() + throttleTtlSec * 1000);

  // อนุญาตถ้า: ยังไม่มี doc หรือ nextAllowedAt <= now
  const res = await EventThrottle.updateOne(
    { key, $or: [{ nextAllowedAt: { $lte: now } }, { nextAllowedAt: { $exists: false } }] },
    { $set: { key, nextAllowedAt, expireAt } },
    { upsert: true }
  );

  // allowed ถ้า upserted หรือ matched แล้วแก้ได้
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
        await ch.assertExchange(ex, "topic", { durable: true });
        await ch.assertQueue(q, { durable: true });
        await ch.bindQueue(q, ex, key);
        ch.prefetch(1);
        console.log(`[rabbit] bound queue=${q} → exchange=${ex} key=${key}`);
        console.log("notification-consumer ready.");

        await ch.consume(
          q,
          async (msg: ConsumeMessage | null) => {
            if (!msg) return;

            const safeAck = () => { try { ch!.ack(msg); } catch {} };
            const safeRequeue = () => { try { ch!.nack(msg, false, true); } catch {} };

            try {
              const payload = JSON.parse(msg.content.toString());
              const type = payload?.eventType as EventKind | undefined;
              const eid  = payload?.data?.eventId as (string | undefined);

              if (!eid || !type || !["created","updated","deleted"].includes(type)) {
                console.warn("[consume] invalid payload", payload);
                return safeAck();
              }

              const dedupeKey = `${type}:${eid}`;

              // ---------- THROTTLE: กันยิงถี่เกิน ----------
              const allowed = await passThrottle(dedupeKey);
              if (!allowed) {
                console.log("[throttle] skip burst", dedupeKey);
                return safeAck(); // ข้ามแบบนุ่ม ๆ
              }

              // ---------- IDEMPOTENT LOCK: กันซ้ำรอบเดียวกัน + TTL ----------
              const ttlSec = Number(process.env.DEDUP_TTL_SECONDS || 7 * 24 * 60 * 60); // 7 วัน
              const now = new Date();
              const expireAt = new Date(now.getTime() + ttlSec * 1000);

              try {
                await ProcessedEvent.create({ key: dedupeKey, createdAt: now, expireAt });
              } catch (e: any) {
                if (e?.code === 11000) {
                  console.log("[idempotent] already processed, skip", dedupeKey);
                  return safeAck();
                }
                throw e;
              }

              // ---------- ยิงจริง ----------
              const result = await broadcastByEventId(eid, type);
              console.log("[consume] broadcast result:", result);

              return safeAck();

            } catch (err) {
              console.error("[consume] error, will requeue:", err);

              // คืนล็อก (ถ้าล็อกไปแล้ว) เพื่อให้ลองใหม่รอบหน้า
              try {
                const payload = JSON.parse(msg.content.toString());
                const k = `${payload?.eventType}:${payload?.data?.eventId}`;
                if (k.includes(":")) await ProcessedEvent.deleteOne({ key: k });
              } catch {}

              return safeRequeue();
            }
          },
          { noAck: false }
        );

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
