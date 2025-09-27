// src/services/matching.ts
import { Court, Event, Game, Player, ParticipantRuntime } from "../models/types";
import { RuntimeState } from "../models/enums";
import { GameLog } from "../models/matchingLog";
import { Store } from "../models/store";

// ---------- time helpers ----------
const toMs = (iso: string) => new Date(iso).getTime();
const nowIso = () => new Date().toISOString();

function isAvailableAt(p: Player, tIso: string) {
  const t = toMs(tIso);
  return toMs(p.availableStart) <= t && t < toMs(p.availableEnd);
}

// ---------- runtime helpers (state แยกจากข้อมูลลงทะเบียน) ----------
function getRt(e: Event, playerId: string): ParticipantRuntime {
  let rt = e.runtimes[playerId];
  if (!rt) {
    rt = {
      playerId,
      state: RuntimeState.Idle,
      gamesPlayed: 0,
      lastPlayedAt: null,
      waitingSince: null,
    };
    e.runtimes[playerId] = rt;
  }
  return rt;
}

function initRuntimesForPlayers(players: Player[]): Record<string, ParticipantRuntime> {
  const runtimes: Record<string, ParticipantRuntime> = {};
  for (const p of players) {
    runtimes[p.id] = {
      playerId: p.id,
      state: RuntimeState.Idle,
      gamesPlayed: 0,
      lastPlayedAt: null,
      waitingSince: null,
    };
  }
  return runtimes;
}

// ---------- queue: สร้างใหม่แบบเรียบง่ายทุกครั้ง ----------
/**
 * สร้างคิวใหม่จากผู้เล่นที่ "พร้อม ณ at" และ "ไม่ได้กำลัง Playing"
 * เรียงลำดับโดย:
 *  1) gamesPlayed ASC (ใครเล่นน้อยสุดมาก่อน)
 *  2) waitingSince ASC (ใครรอนานกว่ามาก่อน)
 */
function rebuildQueue(e: Event, at: string) {
  const ready = e.players.filter((p) => isAvailableAt(p, at) && getRt(e, p.id).state !== RuntimeState.Playing);

  for (const p of ready) {
    const rt = getRt(e, p.id);
    if (rt.state !== RuntimeState.Waiting) {
      rt.state = RuntimeState.Waiting;
      if (!rt.waitingSince) rt.waitingSince = at;
    }
  }

  // sort ตามกติกา fairness แบบง่าย
  ready.sort((a, b) => {
    const ra = getRt(e, a.id);
    const rb = getRt(e, b.id);
    if (ra.gamesPlayed !== rb.gamesPlayed) return ra.gamesPlayed - rb.gamesPlayed;
    const wa = ra.waitingSince ? toMs(ra.waitingSince) : Number.MAX_SAFE_INTEGER;
    const wb = rb.waitingSince ? toMs(rb.waitingSince) : Number.MAX_SAFE_INTEGER;
    return wa - wb;
  });

  e.queue = ready.map((p) => p.id);
}

/** ดึงคนบนสุด k คนจากคิว (ต้องพร้อม ณ at และไม่กำลังเล่น) */
function takeTopK(e: Event, k: number, at: string): Player[] {
  const out: Player[] = [];
  const keep: string[] = [];
  for (const pid of e.queue) {
    if (out.length >= k) {
      keep.push(pid);
      continue;
    }
    const p = e.players.find((x) => x.id === pid);
    if (!p) continue;
    const rt = getRt(e, pid);
    if (isAvailableAt(p, at) && rt.state !== RuntimeState.Playing) {
      out.push(p);
    } else {
      // ถ้าไม่พร้อมแล้วก็ไม่ต้องเก็บไว้ในคิว
    }
  }
  // ตัดคนที่หยิบไปแล้วออกจากคิว
  const taken = new Set(out.map((p) => p.id));
  e.queue = keep.filter((pid) => !taken.has(pid));
  return out;
}

// ---------- game helpers ----------
function createGame(court: Court, players: Player[], at: string): Game {
  return {
    id: `g_${court.id}_${Date.now()}`,
    courtId: court.id,
    playerIds: players.map((p) => p.id),
    startTime: at,
    endTime: null,
  };
}

function markPlaying(e: Event, players: Player[], at: string) {
  for (const p of players) {
    const rt = getRt(e, p.id);
    rt.state = RuntimeState.Playing;
    rt.gamesPlayed += 1;
    rt.lastPlayedAt = at;
    rt.waitingSince = null;
  }
}

// ---------- logging (Mongo) ----------
async function logGameStart(
  e: Event,
  courtId: string,
  game: Game,
  queueBefore: string[],
  queueAfter: string[],
  action: "seed" | "advance",
) {
  try {
    await GameLog.create({
      eventId: e.id,
      gameId: game.id,
      courtId,
      action,
      at: nowIso(),
      startTime: game.startTime,
      players: game.playerIds.map((id) => {
        const p = e.players.find((x) => x.id === id)!;
        const rt = getRt(e, id);
        return {
          id: p.id,
          userId: (p as any).userId ?? undefined,
          name: p.name,
          registrationStatus: (p as any).registrationStatus ?? undefined,
          runtimeState: rt.state,
        };
      }),
      anchors: [], // เราไม่ใช้คอนเซ็ปต์ anchors แล้วในเวอร์ชันเรียบง่ายนี้
      queueBefore,
      queueAfter,
      metrics: { playersCount: game.playerIds.length },
    });
  } catch (err) {
    console.error("[logGameStart] ERROR:", err);
  }
}

// ---------- presenter (แปลง games.playerIds -> [{id, name}]) ----------
function serializeEventForClient(e: Event) {
  const findName = (id: string) => e.players.find((p) => p.id === id)?.name ?? null;
  return {
    id: e.id,
    courts: e.courts,
    createdAt: e.createdAt,
    queue: e.queue
      .map((pid) => {
        const p = e.players.find((x) => x.id === pid);
        return p ? { ...p, runtime: getRt(e, pid) } : undefined;
      })
      .filter(Boolean),
    players: e.players.map((p) => ({ ...p, runtime: getRt(e, p.id) })),
    games: e.games.map((g) => ({
      ...g,
      playerIds: g.playerIds.map((id) => ({ id, name: findName(id) })),
    })),
  };
}

// ---------- service ----------
export const MatchingService = {
  defaultCourts: 1,

  createEvent(id: string, courts: number, players: Player[]): Event {
    const e: Event = {
      id,
      courts: Array.from({ length: courts }, (_, i) => ({ id: `c${i + 1}`, currentGameId: null })),
      createdAt: nowIso(),
      queue: [],
      games: [],
      players: players.slice(),
      runtimes: initRuntimesForPlayers(players),
    };
    Store.upsertEvent(e);
    return e;
  },

  replacePlayers(eventId: string, players: Player[]): Event {
    const e = Store.getEvent(eventId);
    if (!e) throw new Error("Event not found");

    // reset all runtime/courts/games/queue
    e.courts = e.courts.map((c) => ({ ...c, currentGameId: null }));
    e.games = [];
    e.queue = [];
    e.players = players.slice();
    e.runtimes = initRuntimesForPlayers(players);

    Store.upsertEvent(e);
    return e;
  },

  // จับคู่รอบแรก: เลือก 4 คนต่อคอร์ท โดยเรียง gamesPlayed ASC แล้ว waitingSince ASC
  async seedInitialGames(eventId: string, at: string) {
    const e = Store.getEvent(eventId);
    if (!e) throw new Error("Event not found");

    // สร้างคิวใหม่แบบ simple จากผู้ที่พร้อม ณ at
    rebuildQueue(e, at);

    for (const court of e.courts) {
      if (court.currentGameId) continue;

      const group = takeTopK(e, 4, at);
      if (group.length !== 4) continue; // ต้องครบ 4 เท่านั้น

      const queueBefore = [...e.queue];
      const game = createGame(court, group, at);
      e.games.push(game);
      court.currentGameId = game.id;
      markPlaying(e, group, at);

      await logGameStart(e, court.id, game, queueBefore, [...e.queue], "seed");
    }

    Store.upsertEvent(e);
    return serializeEventForClient(e) as any;
  },

  // จบเกมคอร์ทนี้ แล้วเริ่มเกมใหม่ด้วยกติกาเดียวกัน
  async finishAndRefill(eventId: string, courtId: string, at: string) {
    const e = Store.getEvent(eventId);
    if (!e) throw new Error("Event not found");
    const court = e.courts.find((c) => c.id === courtId);
    if (!court) throw new Error("Court not found");

    // 1) จบเกมเดิม (ถ้ามี)
    if (court.currentGameId) {
      const g = e.games.find((x) => x.id === court.currentGameId)!;
      g.endTime = at;

      // คืนสถานะผู้เล่นจากเกมเดิม
      for (const pid of g.playerIds) {
        const p = e.players.find((x) => x.id === pid);
        if (!p) continue;
        const rt = getRt(e, pid);
        rt.state = RuntimeState.Idle;
        // ไม่บวก gamesPlayed ที่นี่ เพราะบวกไปแล้วตอนเริ่มเกม (markPlaying)
      }
      court.currentGameId = null;
    }

    // 2) สร้างคิวใหม่จากทุกคนที่พร้อม ณ at (รวมคนจากเกมก่อนหน้าด้วย ถ้ายังอยู่ในช่วงเวลา)
    rebuildQueue(e, at);

    // 3) เติมเกมใหม่
    const group = takeTopK(e, 4, at);
    if (group.length === 4) {
      const queueBefore = [...e.queue];
      const game = createGame(court, group, at);
      e.games.push(game);
      court.currentGameId = game.id;
      markPlaying(e, group, at);

      await logGameStart(e, court.id, game, queueBefore, [...e.queue], "advance");
    }

    Store.upsertEvent(e);
    return serializeEventForClient(e) as any;
  },

  // จบทุกคอร์ท แล้วเริ่มใหม่พร้อมกัน
  async advanceAll(eventId: string, at: string) {
    const e = Store.getEvent(eventId);
    if (!e) throw new Error("Event not found");

    // ปิดทุกเกมที่เปิดอยู่
    for (const court of e.courts) {
      if (!court.currentGameId) continue;
      const g = e.games.find((x) => x.id === court.currentGameId)!;
      g.endTime = at;
      for (const pid of g.playerIds) {
        const rt = getRt(e, pid);
        rt.state = RuntimeState.Idle;
      }
      court.currentGameId = null;
    }

    // สร้างคิวใหม่
    rebuildQueue(e, at);

    // เติมทุกคอร์ท
    for (const court of e.courts) {
      const group = takeTopK(e, 4, at);
      if (group.length !== 4) continue;

      const queueBefore = [...e.queue];
      const game = createGame(court, group, at);
      e.games.push(game);
      court.currentGameId = game.id;
      markPlaying(e, group, at);

      await logGameStart(e, court.id, game, queueBefore, [...e.queue], "advance");
    }

    Store.upsertEvent(e);
    return serializeEventForClient(e) as any;
  },

  status(eventId: string) {
    const e = Store.getEvent(eventId);
    if (!e) throw new Error("Event not found");
    return serializeEventForClient(e);
  },
};
