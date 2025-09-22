import { Court, Event, Game, Player, PlayerState } from '../models/types';
import { GameLog, MatchRun } from '../models/matchingLog';
import { Store } from '../models/store';

// --- time helpers ---
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
  return pool.filter(x => set.has(x.id));
}

// --- grouping (no-skill) ---
function buildGroupNoSkill(
  anchors: Player[],
  pool: Player[],
  at: string
): Player[] | null {
  // เอาเฉพาะคนที่ "พร้อม ณ at" และยังไม่ได้ Playing
  const candidates = pool.filter(p => isAvailableAt(p, at) && p.state !== PlayerState.Playing);

  // เตรียมฐานด้วย anchors (unique)
  const base: Player[] = [];
  const seen = new Set<string>();
  for (const a of anchors) if (!seen.has(a.id)) { base.push(a); seen.add(a.id); }

  // เติมแบบสุ่มจาก candidates ให้ครบ 4
  for (const c of randomShuffle(candidates)) {
    if (base.length >= 4) break;
    if (!seen.has(c.id)) { base.push(c); seen.add(c.id); }
  }

  return base.length === 4 ? base : null;
}

function createGame(court: Court, players: Player[], at: string): Game {
  return {
    id: `g_${court.id}_${Date.now()}`,
    courtId: court.id,
    playerIds: players.map(p => p.id),
    startTime: at,
    endTime: null
  };
}

function markPlaying(players: Player[], at: string) {
  for (const p of players) {
    p.state = PlayerState.Playing;
    p.gamesPlayed += 1;
    p.lastPlayedAt = at;
    p.waitingSince = null;
  }
}

function enqueueIfWaiting(e: Event, ps: Player[], at: string) {
  for (const p of ps) {
    if (p.state === PlayerState.Idle || p.state === PlayerState.Waiting) {
      p.state = PlayerState.Waiting;
      if (!p.waitingSince) p.waitingSince = at;
      if (!e.queue.includes(p.id)) e.queue.push(p.id);
    }
  }
}

function dequeueUpTo(e: Event, k: number, at: string): Player[] {
  // ล้างคิวที่ไม่พร้อม/กำลังเล่น ออกก่อน
  e.queue = e.queue.filter(pid => {
    const p = e.players.find(x => x.id === pid)!;
    return isAvailableAt(p, at) && p.state !== PlayerState.Playing;
  });

  const picked: Player[] = [];
  while (picked.length < k && e.queue.length) {
    const pid = e.queue.shift()!;
    const p = e.players.find(x => x.id === pid)!;
    if (isAvailableAt(p, at) && p.state !== PlayerState.Playing) {
      picked.push(p);
    }
  }
  return picked;
}

function removeFromQueue(e: Event, ids: string[]) {
  const rm = new Set(ids);
  e.queue = e.queue.filter(pid => !rm.has(pid));
}

export const MatchingService = {
  defaultCourts: 2,

  createEvent(id: string, courts: number, players: Player[]): Event {
    const e: Event = {
      id,
      courts: Array.from({ length: courts }, (_, i) => ({ id: `c${i+1}`, currentGameId: null })),
      createdAt: nowIso(),
      queue: [],
      games: [],
      players
    };
    Store.upsertEvent(e);
    return e;
  },


 replacePlayers(eventId: string, players: Player[]): Event {
  const e = Store.getEvent(eventId);
  if (!e) throw new Error('Event not found');

  // reset courts/games/queue
  e.courts = e.courts.map(c => ({ ...c, currentGameId: null }));
  e.games = [];
  e.queue = [];

  // normalize players -> ตั้งค่าเริ่มต้นให้ชัวร์
  e.players = players.map(p => ({
    ...p,
    gamesPlayed: p.gamesPlayed ?? 0,
    lastPlayedAt: null,
    state: PlayerState.Idle,
    waitingSince: null
  }));

  Store.upsertEvent(e);
  return e;
},

  // บันทึก log ต่อเกม
  async logGameStart(e: Event, courtId: string, game: Game, anchors: Player[], queueBefore: string[], queueAfter: string[], action: 'seed'|'advance', at: string) {
    await GameLog.create({
      eventId: e.id,
      gameId: game.id,
      courtId,
      action,
      at,
      startTime: game.startTime,
      players: game.playerIds.map(id => {
        const p = e.players.find(x => x.id === id)!;
        return { id: p.id, name: p.name };
      }),
      anchors: anchors.map(a => a.id),
      queueBefore,
      queueAfter,
      metrics: { playersCount: game.playerIds.length }
    });
  },

  async logRun(e: Event, type: 'seed'|'advance'|'advance-all', at: string, courtsAffected: string[], queueBefore: string[], gamesStarted: Array<{ gameId: string, courtId: string }>) {
    await MatchRun.create({
      eventId: e.id,
      type,
      at,
      courtsAffected,
      queueBefore,
      queueAfter: [...e.queue],
      gamesStarted
    });
  },

  async seedInitialGames(eventId: string, at: string) {
    const e = Store.getEvent(eventId);
    if (!e) throw new Error('Event not found');

    // enqueue คนที่พร้อม ณ at
    const avail = e.players.filter(p => isAvailableAt(p, at));
    enqueueIfWaiting(e, avail, at);

    const queueBeforeAll = [...e.queue];
    const gamesStarted: Array<{ gameId: string, courtId: string }> = [];
    const courtsAffected: string[] = [];

    for (const court of e.courts) {
      if (court.currentGameId) continue;

      const anchors = dequeueUpTo(e, 2, at);           // 2 คนที่รอนานสุด
      let group: Player[] | null = null;
      if (anchors.length) group = buildGroupNoSkill(anchors, e.players, at);
      if (!group) {
        const candidates = e.players.filter(p => isAvailableAt(p, at) && p.state !== PlayerState.Playing);
        const g = randomShuffle(candidates).slice(0, 4);
        group = g.length === 4 ? g : null;
      }

      if (group) {
        const queueBeforeCourt = [...e.queue];
        removeFromQueue(e, group.map(p => p.id));       // กันคิวซ้ำ

        const game = createGame(court, group, at);
        e.games.push(game);
        court.currentGameId = game.id;
        markPlaying(group, at);

        await this.logGameStart(e, court.id, game, anchors, queueBeforeCourt, [...e.queue], 'seed', at);
        gamesStarted.push({ gameId: game.id, courtId: court.id });
        courtsAffected.push(court.id);
      }
    }

    Store.upsertEvent(e);
    await this.logRun(e, 'seed', at, courtsAffected, queueBeforeAll, gamesStarted);
    return e;
  },

  async finishAndRefill(eventId: string, courtId: string, at: string) {
    const e = Store.getEvent(eventId);
    if (!e) throw new Error('Event not found');
    const court = e.courts.find(c => c.id === courtId);
    if (!court) throw new Error('Court not found');

    const queueBeforeAll = [...e.queue];

    // end current game
    if (court.currentGameId) {
      const g = e.games.find(x => x.id === court.currentGameId)!;
      g.endTime = at;
      const players = takeById(g.playerIds, e.players);
      for (const p of players) p.state = PlayerState.Idle;
      enqueueIfWaiting(e, players, at);
      court.currentGameId = null;
      // ล้างคิวที่ไม่สมเหตุผล
      e.queue = e.queue.filter(pid => {
        const p = e.players.find(x => x.id === pid)!;
        return isAvailableAt(p, at) && p.state !== PlayerState.Playing;
      });
    }

    // refill: 2 คนที่รอนานสุดเป็น anchors
    const anchors = dequeueUpTo(e, 2, at);
    let group: Player[] | null = null;
    if (anchors.length) group = buildGroupNoSkill(anchors, e.players, at);
    if (!group) {
      const candidates = e.players.filter(p => isAvailableAt(p, at) && p.state !== PlayerState.Playing);
      const g = randomShuffle(candidates).slice(0, 4);
      group = g.length === 4 ? g : null;
    }

    if (group) {
      const queueBeforeCourt = [...e.queue];
      removeFromQueue(e, group.map(p => p.id));

      const game = createGame(court, group, at);
      e.games.push(game);
      court.currentGameId = game.id;
      markPlaying(group, at);

      await this.logGameStart(e, court.id, game, anchors, queueBeforeCourt, [...e.queue], 'advance', at);
    }

    Store.upsertEvent(e);
    await this.logRun(e, 'advance', at, [courtId], queueBeforeAll, court.currentGameId ? [{ gameId: court.currentGameId, courtId }] : []);
    return e;
  },

  status(eventId: string) {
    const e = Store.getEvent(eventId);
    if (!e) throw new Error('Event not found');
    return {
      id: e.id,
      courts: e.courts.map(c => ({
        id: c.id,
        currentGame: c.currentGameId ? e.games.find(g => g.id === c.currentGameId) : null
      })),
      queue: e.queue.map(pid => e.players.find(p => p.id === pid)),
      players: e.players
    };
  }
};
