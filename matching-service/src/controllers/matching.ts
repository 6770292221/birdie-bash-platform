import { Request, Response } from "express";
import { MatchingService } from "../services/matching";
import { buildMockPlayers } from "../data/mock";

export const MatchingsController = {
  create: (req: Request, res: Response) => {
    const {
      id = `event_${Date.now()}`,
      courts = 2,
      useMock = true,
      players = [],
    } = req.body || {};
    const p = useMock ? buildMockPlayers() : players;
    const e = MatchingService.createEvent(id, Number(courts), p);
    res.json({ ok: true, event: e });
  },

  seed: (req: Request, res: Response) => {
    const { eventId, at = new Date().toISOString() } = req.body || {};
    try {
      const e = MatchingService.seedInitialGames(eventId, at);
      res.json({ ok: true, event: e });
    } catch (err: any) {
      res.status(400).json({ ok: false, message: err.message });
    }
  },

  finishAndRefill: (req: Request, res: Response) => {
    const { eventId, courtId, at = new Date().toISOString() } = req.body || {};
    try {
      const e = MatchingService.finishAndRefill(eventId, courtId, at);
      res.json({ ok: true, event: e });
    } catch (err: any) {
      res.status(400).json({ ok: false, message: err.message });
    }
  },

  status: (req: Request, res: Response) => {
    const { eventId } = req.params;
    try {
      const s = MatchingService.status(eventId);
      res.json({ ok: true, status: s });
    } catch (err: any) {
      res.status(404).json({ ok: false, message: err.message });
    }
  },

  advanceAll: (req: Request, res: Response) => {
    const { eventId, at = new Date().toISOString() } = req.body || {};
    try {
      // ดึง court ทั้งหมดจาก status แล้ววนเรียก finishAndRefill ทีละคอร์ท
      const s = MatchingService.status(eventId);
      for (const c of s.courts) {
        // จะมี/ไม่มี currentGame ก็เรียกได้: ถ้ามีจะปิดแล้วเติม, ถ้าไม่มีจะพยายามเติม
        MatchingService.finishAndRefill(eventId, c.id, at);
      }
      const after = MatchingService.status(eventId);
      res.json({ ok: true, status: after });
    } catch (err: any) {
      res.status(400).json({ ok: false, message: err.message });
    }
  },
};
