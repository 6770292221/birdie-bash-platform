// src/services/matching.ts
import {
  Court,
  Event,
  Game,
  Player,
  ParticipantRuntime,
} from "../models/types";
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

function randomShuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function takeById<T extends { id: string }>(ids: string[], pool: T[]): T[] {
  const set = new Set(ids);
  return pool.filter((x) => set.has(x.id));
}

// ---------- uniq + quartet guards ----------
function uniqueById<T extends { id: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of arr) {
    if (!seen.has(x.id)) {
      seen.add(x.id);
      out.push(x);
    }
  }
  return out;
}
function enforceQuartet(group: Player[] | null): Player[] | null {
  if (!group) return null;
  const u = uniqueById(group);
  if (u.length < 4) return null;
  return u.slice(0, 4);
}

// ---------- runtime helpers ----------
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
function initRuntimesForPlayers(
  players: Player[]
): Record<string, ParticipantRuntime> {
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

// ---------- queue tools ----------
function enqueueIfWaiting(e: Event, ps: Player[], at: string) {
  for (const p of ps) {
    const rt = getRt(e, p.id);
    if (rt.state !== RuntimeState.Playing) {
      rt.state = RuntimeState.Waiting;
      if (!rt.waitingSince) rt.waitingSince = at;
      if (!e.queue.includes(p.id)) e.queue.push(p.id);
    }
  }
}
function purgeQueue(e: Event, at: string) {
  const seen = new Set<string>();
  e.queue = e.queue.filter((pid) => {
    if (seen.has(pid)) return false;
    seen.add(pid);
    const p = e.players.find((x) => x.id === pid);
    const rt = p ? getRt(e, pid) : undefined;
    return !!p && !!rt && isAvailableAt(p, at) && rt.state !== RuntimeState.Playing;
  });
}
function dequeueUpTo(e: Event, k: number, at: string): Player[] {
  purgeQueue(e, at);
  const picked: Player[] = [];
  while (picked.length < k && e.queue.length) {
    const pid = e.queue.shift()!;
    const p = e.players.find((x) => x.id === pid)!;
    const rt = getRt(e, pid);
    if (isAvailableAt(p, at) && rt.state !== RuntimeState.Playing) picked.push(p);
  }
  return picked;
}
function removeFromQueue(e: Event, ids: string[]) {
  const rm = new Set(ids);
  e.queue = e.queue.filter((pid) => !rm.has(pid));
}

// ---------- preferred helpers ----------
type PreferredItem = { playerId?: string; userId?: string; name?: string };

function moveToFrontQueue(e: Event, playerIds: string[]) {
  const uniq = Array.from(new Set(playerIds));
  const rm = new Set(uniq);
  e.queue = e.queue.filter((pid) => !rm.has(pid));
  e.queue = [...uniq, ...e.queue];
}
function fairnessKey(e: Event, id: string, at: string) {
  const rt = getRt(e, id);
  const ws = rt.waitingSince ?? at;
  const lp = rt.lastPlayedAt ?? at;
  return [rt.gamesPlayed, toMs(ws), toMs(lp)];
}
function reorderQueueByFairness(e: Event, at: string) {
  const uniq = Array.from(new Set(e.queue));
  uniq.sort((a, b) => {
    const ka = fairnessKey(e, a, at);
    const kb = fairnessKey(e, b, at);
    if (ka[0] !== kb[0]) return ka[0] - kb[0];
    if (ka[1] !== kb[1]) return ka[1] - kb[1];
    return ka[2] - kb[2];
  });
  e.queue = uniq;
}
function seedQueueIfEmpty(e: Event, at: string) {
  if (e.queue.length) return;
  const ready = e.players.filter(
    (p) => isAvailableAt(p, at) && getRt(e, p.id).state !== RuntimeState.Playing
  );
  if (!ready.length) return;
  for (const p of ready) {
    const rt = getRt(e, p.id);
    if (rt.state !== RuntimeState.Waiting) {
      rt.state = RuntimeState.Waiting;
      if (!rt.waitingSince) rt.waitingSince = at;
    }
    if (!e.queue.includes(p.id)) e.queue.push(p.id);
  }
  reorderQueueByFairness(e, at);
}

// ---------- grouping (no skill) ----------
function buildGroupNoSkill(
  anchors: Player[],
  pool: Player[],
  at: string,
  e: Event
): Player[] | null {
  const base: Player[] = uniqueById(anchors);
  const candidates = pool.filter(
    (p) => isAvailableAt(p, at) && getRt(e, p.id).state !== RuntimeState.Playing
  );
  for (const c of randomShuffle(candidates)) {
    if (base.length >= 4) break;
    if (!base.find((b) => b.id === c.id)) base.push(c);
  }
  return enforceQuartet(base);
}

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

// ---------- logging ----------
async function logGameStart(
  e: Event,
  courtId: string,
  game: Game,
  anchors: Player[],
  queueBefore: string[],
  queueAfter: string[],
  action: "seed" | "advance" | "close",
  at: string
) {
  try {
    await GameLog.create({
      eventId: e.id,
      gameId: game.id,
      courtId,
      action,
      at,
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
      anchors: anchors.map((a) => a.id),
      queueBefore,
      queueAfter,
      metrics: { playersCount: game.playerIds.length },
    });
  } catch (err) {
    console.error("[logGameStart] ERROR:", err);
  }
}

// ---------- presenter ----------
function serializeEventForClient(e: Event) {
  const findName = (id: string) =>
    e.players.find((p) => p.id === id)?.name ?? null;

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
  defaultCourts: 2,

  createEvent(id: string, courts: number, players: Player[]): Event {
    const e: Event = {
      id,
      courts: Array.from({ length: courts }, (_, i) => ({
        id: `c${i + 1}`,
        currentGameId: null,
      })),
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

    e.courts = e.courts.map((c) => ({ ...c, currentGameId: null }));
    e.games = [];
    e.queue = [];
    e.players = players.slice();
    e.runtimes = initRuntimesForPlayers(players);

    Store.upsertEvent(e);
    return e;
  },

  async seedInitialGames(eventId: string, at: string) {
    const e = Store.getEvent(eventId);
    if (!e) throw new Error("Event not found");

    const avail = e.players.filter((p) => isAvailableAt(p, at));
    enqueueIfWaiting(e, avail, at);
    purgeQueue(e, at);
    seedQueueIfEmpty(e, at);
    reorderQueueByFairness(e, at);

    for (const court of e.courts) {
      if (court.currentGameId) continue;

      const anchors = dequeueUpTo(e, 2, at);
      let group: Player[] | null = null;

      if (anchors.length) group = buildGroupNoSkill(anchors, e.players, at, e);
      if (!group) {
        const candidates = e.players.filter(
          (p) => isAvailableAt(p, at) && getRt(e, p.id).state !== RuntimeState.Playing
        );
        group = enforceQuartet(randomShuffle(candidates).slice(0, 4));
      }

      if (group) {
        const queueBeforeCourt = [...e.queue];
        removeFromQueue(e, group.map((p) => p.id));

        const game = createGame(court, group, at);
        e.games.push(game);
        court.currentGameId = game.id;
        markPlaying(e, group, at);

        await logGameStart(e, court.id, game, anchors, queueBeforeCourt, [...e.queue], "seed", at);
      }
    }

    Store.upsertEvent(e);
    return serializeEventForClient(e) as any;
  },

  async finishAndRefill(eventId: string, courtId: string, at: string) {
    const e = Store.getEvent(eventId);
    if (!e) throw new Error("Event not found");
    const court = e.courts.find((c) => c.id === courtId);
    if (!court) throw new Error("Court not found");

    // end current game
    if (court.currentGameId) {
      const g = e.games.find((x) => x.id === court.currentGameId)!;
      g.endTime = at;

      const prevPlayers = takeById(g.playerIds, e.players);
      for (const p of prevPlayers) getRt(e, p.id).state = RuntimeState.Idle;

      enqueueIfWaiting(e, prevPlayers, at);
      court.currentGameId = null;
      purgeQueue(e, at);
    }

    // refill
    const anchors = dequeueUpTo(e, 2, at);
    let group: Player[] | null = null;

    if (anchors.length) group = buildGroupNoSkill(anchors, e.players, at, e);
    if (!group) {
      const candidates = e.players.filter(
        (p) => isAvailableAt(p, at) && getRt(e, p.id).state !== RuntimeState.Playing
      );
      group = enforceQuartet(randomShuffle(candidates).slice(0, 4));
    }

    if (group) {
      const queueBeforeCourt = [...e.queue];
      removeFromQueue(e, group.map((p) => p.id));

      const game = createGame(court, group, at);
      e.games.push(game);
      court.currentGameId = game.id;
      markPlaying(e, group, at);

      await logGameStart(e, court.id, game, anchors, queueBeforeCourt, [...e.queue], "advance", at);
    }

    Store.upsertEvent(e);
    return serializeEventForClient(e) as any;
  },

  async advanceAll(eventId: string, at: string) {
    const e = Store.getEvent(eventId);
    if (!e) throw new Error("Event not found");

    // end all current games
    for (const court of e.courts) {
      if (!court.currentGameId) continue;
      const g = e.games.find((x) => x.id === court.currentGameId)!;
      g.endTime = at;

      const prevPlayers = takeById(g.playerIds, e.players);
      for (const p of prevPlayers) getRt(e, p.id).state = RuntimeState.Idle;

      enqueueIfWaiting(e, prevPlayers, at);
      court.currentGameId = null;
    }
    purgeQueue(e, at);

    // refill all courts
    for (const court of e.courts) {
      const anchors = dequeueUpTo(e, 2, at);
      let group: Player[] | null = null;

      if (anchors.length) group = buildGroupNoSkill(anchors, e.players, at, e);
      if (!group) {
        const candidates = e.players.filter(
          (p) => isAvailableAt(p, at) && getRt(e, p.id).state !== RuntimeState.Playing
        );
        group = enforceQuartet(randomShuffle(candidates).slice(0, 4));
      }

      if (group) {
        const queueBeforeCourt = [...e.queue];
        removeFromQueue(e, group.map((p) => p.id));

        const game = createGame(court, group, at);
        e.games.push(game);
        court.currentGameId = game.id;
        markPlaying(e, group, at);

        await logGameStart(e, court.id, game, anchors, queueBeforeCourt, [...e.queue], "advance", at);
      }
    }

    Store.upsertEvent(e);
    return serializeEventForClient(e) as any;
  },

  /** ปิดงาน/กลับบ้าน: ปิดทุกเกมที่ยังเล่นอยู่, ล้างคิว, เซ็ตทุกคน Idle */
  async closeEvent(eventId: string, at: string) {
    const e = Store.getEvent(eventId);
    if (!e) throw new Error("Event not found");

    // ปิดทุกคอร์ท (ถ้ามีเกมค้าง)
    for (const court of e.courts) {
      if (!court.currentGameId) continue;
      const g = e.games.find((x) => x.id === court.currentGameId)!;
      if (!g.endTime) g.endTime = at;

      const players = takeById(g.playerIds, e.players);
      // เขียน log ปิดเกม
      await logGameStart(e, court.id, g, [], [...e.queue], [...e.queue], "close", at);

      // reset runtime
      for (const p of players) {
        const rt = getRt(e, p.id);
        rt.state = RuntimeState.Idle;
        rt.waitingSince = null;
      }
      court.currentGameId = null;
    }

    // ล้างคิว และรีเซ็ตทุกคนเป็น Idle
    e.queue = [];
    for (const p of e.players) {
      const rt = getRt(e, p.id);
      rt.state = RuntimeState.Idle;
      rt.waitingSince = null;
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
