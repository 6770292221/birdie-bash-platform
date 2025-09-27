// src/controllers/matching.ts
import { Request, Response } from "express";
import { MatchingService } from "../services/matching";
import { Store } from "../models/store";
import { Player } from "../models/types";

// ---------- fetch helpers ----------
async function fetchJSON<T>(url: string, auth?: string): Promise<T> {
  console.log(`🔍 Fetching: ${url}`);
  console.log(`🔐 Auth header: ${auth ? "Present" : "None"}`);

  try {
    const resp = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
    });

    console.log(`📡 Response status: ${resp.status} ${resp.statusText}`);

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      console.error(`❌ Fetch failed ${resp.status}: ${txt}`);
      console.error(`❌ URL: ${url}`);
      throw new Error(`Fetch failed ${resp.status}: ${txt}`);
    }

    const data = await resp.json();
    console.log(`✅ Response data:`, JSON.stringify(data, null, 2));
    return data as T;
  } catch (error) {
    console.error(`💥 fetchJSON error for ${url}:`, error);
    throw error;
  }
}

const REGISTER_BASE = process.env.REGISTER_BASE_URL || "http://localhost:3005";
const EVENT_BASE = process.env.EVENT_BASE_URL || "http://localhost:3003";
const AUTH_BASE = process.env.AUTH_BASE_URL || "http://localhost:3001";

const toISO = (eventDate: string, hhmm: string) =>
  `${eventDate}T${hhmm}:00+07:00`;

// ---------- upstream getters ----------
async function getEvent(
  eventId: string,
  auth?: string
): Promise<{ id: string; eventDate: string; courts: { startTime: string; endTime: string }[] }> {
  console.log(`📅 Getting event: ${eventId}`);
  const url = `${EVENT_BASE}/api/events/${encodeURIComponent(eventId)}`;
  console.log(`🌐 EVENT_BASE: ${EVENT_BASE}`);

  const data = await fetchJSON<{ event: any }>(url, auth);
  if (!data?.event) throw new Error("EVENT_DATA_NOT_FOUND");
  return data.event;
}

async function getRegistrations(eventId: string, auth?: string) {
  console.log(`👥 Getting registrations for event: ${eventId}`);
  const url = `${REGISTER_BASE}/api/registration/events/${encodeURIComponent(
    eventId
  )}/players?limit=200&offset=0`;
  console.log(`🌐 REGISTER_BASE: ${REGISTER_BASE}`);

  const data = await fetchJSON<{ players: any[] }>(url, auth);
  const registered = (data.players || []).filter(
    (p) => p.status === "registered"
  );
  console.log(
    `✅ Found ${registered.length} registered players / total ${data.players?.length || 0}`
  );
  return registered;
}

async function getUserName(userId: string, auth?: string) {
  const url = `${AUTH_BASE}/api/auth/user/${encodeURIComponent(userId)}`;
  try {
    const data = await fetchJSON<{ user: { name?: string | null } }>(
      url,
      auth
    );
    return data?.user?.name ?? null;
  } catch {
    return null;
  }
}

// ---------- build players for matching ----------
async function buildPlayers(
  eventDate: string,
  regs: any[],
  auth?: string
): Promise<Player[]> {
  const players: Player[] = [];
  for (const r of regs) {
    let display = (r.name as string) || null;
    if (!display && r.userId) display = await getUserName(r.userId, auth);
    if (!display) display = r.email || r.phoneNumber || r.playerId;

    players.push({
      id: r.playerId, // ใช้ playerId เป็นคีย์หลัก
      name: display,
      email: r.email ?? null,
      phoneNumber: r.phoneNumber ?? null,
      availableStart: toISO(eventDate, r.startTime),
      availableEnd: toISO(eventDate, r.endTime),
      registrationStatus: r.status ?? "registered",
      gamesPlayed: 0,
    } as Player);
  }
  return players;
}

// ---------- ensure event loaded in memory store ----------
async function ensureEventLoaded(eventId: string, auth?: string) {
  let e = Store.getEvent(eventId);
  if (e) return e;

  const ev = await getEvent(eventId, auth);
  const regs = await getRegistrations(eventId, auth);
  const players = await buildPlayers(ev.eventDate, regs, auth);
  const courtsCount = ev.courts?.length ?? 0;
  if (courtsCount <= 0) throw new Error("This event has 0 courts");

  e = MatchingService.createEvent(eventId, courtsCount, players);
  return e;
}

// ---------- controller ----------
export const MatchingsController = {
  // POST /api/matchings/seed  { eventId }
  seed: async (req: Request, res: Response) => {
    const { eventId } = req.body || {};
    if (!eventId) {
      return res
        .status(400)
        .json({ success: false, message: "eventId is required" });
    }

    try {
      const auth = req.headers.authorization
        ? String(req.headers.authorization)
        : undefined;

      // โหลด event+players ครั้งแรกเข้าหน่วยความจำ
      await ensureEventLoaded(eventId, auth);

      // คิดเวลา seed = court แรกของวันนั้น (ถ้าไม่มีค่อย fallback เป็น now)
      let atISO: string | undefined;
      try {
        const ev = await getEvent(eventId, auth);
        const startHHmm = ev.courts?.[0]?.startTime;
        if (ev.eventDate && startHHmm) {
          atISO = `${ev.eventDate}T${startHHmm}:00+07:00`;
        }
      } catch {}
      if (!atISO) atISO = new Date().toISOString();

      const updated = await MatchingService.seedInitialGames(eventId, atISO);
      res.json({ success: true, data: { event: updated }, message: "Seeded" });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err instanceof Error ? err.message : "Seed failed",
      });
    }
  },

  // POST /api/matchings/advance  { eventId, courtId, at? }
  finishAndRefill: async (req: Request, res: Response) => {
    const { eventId, courtId, at } = req.body || {};
    if (!eventId || !courtId) {
      return res.status(400).json({
        success: false,
        message: "eventId & courtId are required",
      });
    }

    try {
      const auth = req.headers.authorization
        ? String(req.headers.authorization)
        : undefined;

      // เผื่อ server เพิ่งรีสตาร์ท
      await ensureEventLoaded(eventId, auth);

      const iso = at || new Date().toISOString();
      const updated = await MatchingService.finishAndRefill(
        eventId,
        courtId,
        iso
      );

      res.json({ success: true, data: { event: updated }, message: "Advanced" });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err instanceof Error ? err.message : "Advance failed",
      });
    }
  },

  // GET /api/matchings/:eventId/status
  status: (req: Request, res: Response) => {
    const { eventId } = req.params;
    try {
      const s = MatchingService.status(eventId);
      res.json({ success: true, data: s });
    } catch (err) {
      res.status(404).json({
        success: false,
        message: err instanceof Error ? err.message : "Not found",
      });
    }
  },
};
