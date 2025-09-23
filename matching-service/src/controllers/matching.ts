import { Request, Response } from "express";
import { MatchingService } from "../services/matching";
import { Logger } from "../utils/logger";
import { PlayerState } from "../models/types";


// เวลาใน API อาจเป็น "HH:mm" หรือ ISO; ผูกเข้ากับวัน (YYYY-MM-DD) ที่ส่งมาเป็น baseDate
function toISOFromTime(baseDate: string, timePart: string) {
  if (!timePart) throw new Error('Missing time');
  if (timePart.includes('T')) return timePart; // เป็น ISO อยู่แล้ว
  // NOTE: ถ้าต้องการโซนเวลาอื่น ปรับตรงนี้ได้ (+07:00 คือ Asia/Bangkok)
  return `${baseDate}T${timePart}:00+07:00`;
}


function transformExternalPlayers(baseDate: string, externals: any[]) {
  const regs = (externals || []).filter(
    (x) => String(x.status || '').toLowerCase() === 'registered'
  );

  // โครง Player ภายในของเรา (ไม่มีการไปเปลี่ยน state ของ upstream)
  return regs.map((r) => ({
    id: r.userId || r.playerId,
    name: r.name || '',
    email: r.email || null,
    phoneNumber: r.phoneNumber || null,
    availableStart: toISOFromTime(baseDate, r.startTime),
    availableEnd: toISOFromTime(baseDate, r.endTime),

    // เก็บสถานะการลงทะเบียนจากต้นทางไว้ต่างหาก
    registrationStatus: r.status,
    gamesPlayed: 0,
    lastPlayedAt: null,
    state: PlayerState.Idle,     // ← ใช้ enum
    waitingSince: null
  }));
}


// ดึงผู้เล่นของอีเวนต์จาก service ภายนอก แล้ว sync เข้า MatchingService
export const MatchingsController = {
  // POST /api/matchings
  create: async (req: Request, res: Response) => {
    const { id = `event_${Date.now()}`, courts = 2, eventDate, url } = req.body || {};
    try {
      Logger.info('Create matching event request', { id, courts });

      // 1) ดึง players จาก external API
      const target = url || `http://localhost:3005/api/registration/events/${encodeURIComponent(id)}/players`;
      const resp = await fetch(target, {
        headers: {
          'Content-Type': 'application/json',
          ...(req.headers.authorization ? { Authorization: String(req.headers.authorization) } : {})
        }
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(`Fetch players failed ${resp.status}: ${txt}`);
      }

      const data = (await resp.json()) as any;
      const externals: any[] = data.players ?? data?.data?.players ?? [];

      // baseDate สำหรับประกอบเป็น ISO เช่น "2025-09-23"
      const baseDate =
        eventDate ||
        new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); // YYYY-MM-DD

      // 2) แปลงข้อมูลเป็น Player ภายในของเรา (กรอง registered)
      const transformed = transformExternalPlayers(baseDate, externals);

      // 3) สร้าง event ด้วย players ที่ import มา
      const event = MatchingService.createEvent(id, Number(courts), transformed);

      return res.status(201).json({
        success: true,
        data: { event },
        message: 'Event created with players'
      });
    } catch (error) {
      Logger.error('Create event failed', error);
      return res.status(500).json({
        success: false,
        code: 'MATCHING_EVENT_CREATE_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },


  // POST /api/matchings/seed
  seed: async (req: Request, res: Response) => {
    const { eventId, at = new Date().toISOString() } = req.body || {};
    console.log(eventId, at);
    try {
      if (!eventId)
        return res
          .status(400)
          .json({
            success: false,
            code: "INVALID_REQUEST",
            message: "eventId is required",
          });
      const event = await MatchingService.seedInitialGames(eventId, at);
      console.log(event);
      return res
        .status(200)
        .json({ success: true, data: { event }, message: "Seeded" });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      const status = msg.includes("not found") ? 404 : 500;
      return res
        .status(status)
        .json({ success: false, code: "MATCHING_SEED_FAILED", message: msg });
    }
  },

  // POST /api/matchings/advance
  finishAndRefill: async (req: Request, res: Response) => {
    const { eventId, courtId, at = new Date().toISOString() } = req.body || {};
    try {
      if (!eventId || !courtId)
        return res
          .status(400)
          .json({
            success: false,
            code: "INVALID_REQUEST",
            message: "eventId & courtId are required",
          });
      const event = await MatchingService.finishAndRefill(eventId, courtId, at);
      const court = event.courts.find((c) => c.id === courtId);
      return res
        .status(200)
        .json({
          success: true,
          data: { event, courtId, startedGameId: court?.currentGameId ?? null },
          message: "Advanced",
        });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      const status = msg.includes("not found") ? 404 : 500;
      return res
        .status(status)
        .json({
          success: false,
          code: "MATCHING_ADVANCE_FAILED",
          message: msg,
        });
    }
  },

  // POST /api/matchings/advance-all
  advanceAll: async (req: Request, res: Response) => {
    const { eventId, at = new Date().toISOString() } = req.body || {};
    try {
      if (!eventId)
        return res
          .status(400)
          .json({
            success: false,
            code: "INVALID_REQUEST",
            message: "eventId is required",
          });
      const s = MatchingService.status(eventId);
      const started: Array<{ courtId: string; gameId: string | null }> = [];
      for (const c of s.courts) {
        const ev = await MatchingService.finishAndRefill(eventId, c.id, at);
        const co = ev.courts.find((x) => x.id === c.id);
        started.push({ courtId: c.id, gameId: co?.currentGameId ?? null });
      }
      const after = MatchingService.status(eventId);
      return res
        .status(200)
        .json({
          success: true,
          data: { event: after, started },
          message: "Advanced all",
        });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      const status = msg.includes("not found") ? 404 : 500;
      return res
        .status(status)
        .json({
          success: false,
          code: "MATCHING_ADVANCE_ALL_FAILED",
          message: msg,
        });
    }
  },

  // GET /api/matchings/:eventId/status
  status: async (req: Request, res: Response) => {
    const { eventId } = req.params;
    try {
      const s = MatchingService.status(eventId);
      return res
        .status(200)
        .json({ success: true, data: { status: s }, message: "OK" });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      const status = msg.includes("not found") ? 404 : 500;
      return res
        .status(status)
        .json({ success: false, code: "MATCHING_STATUS_FAILED", message: msg });
    }
  },
};
