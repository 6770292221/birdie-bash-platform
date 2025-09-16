import { Court, Event, Game, Player } from "../models/player";
import { PlayerState, SkillRank } from "../models/enums";
import { Store } from "../models/store";

// --- time helpers ---
const toMs = (iso: string) => new Date(iso).getTime();
const nowIso = () => new Date().toISOString();

// Skill compatibility map (±1)
const compat: Record<SkillRank, SkillRank[]> = {
  [SkillRank.N]: [SkillRank.N, SkillRank.S],
  [SkillRank.S]: [SkillRank.N, SkillRank.S, SkillRank.BG],
  [SkillRank.BG]: [SkillRank.S, SkillRank.BG, SkillRank.P],
  [SkillRank.P]: [SkillRank.BG, SkillRank.P],
};

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return toMs(aStart) < toMs(bEnd) && toMs(bStart) < toMs(aEnd);
}

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

function intersectSkills(skLists: SkillRank[][]): Set<SkillRank> {
  const all = new Set<SkillRank>([
    SkillRank.N,
    SkillRank.S,
    SkillRank.BG,
    SkillRank.P,
  ]);
  for (const l of skLists) {
    for (const s of Array.from(all)) if (!l.includes(s)) all.delete(s);
  }
  return all;
}

function takeById<T extends { id: string }>(ids: string[], pool: T[]): T[] {
  const set = new Set(ids);
  return pool.filter((x) => set.has(x.id));
}

// --- grouping ---
function buildGroup(
  anchors: Player[],
  pool: Player[],
  at: string
): Player[] | null {
  // Filter pool: available now and idle/waiting
  const candidates = pool.filter(
    (p) => isAvailableAt(p, at) && p.state !== PlayerState.Playing
  );

  // Try tight: skills compatible with all anchors
  const compatSet = intersectSkills(anchors.map((a) => compat[a.skill]));
  let filtered = candidates.filter((c) => compatSet.has(c.skill));

  // Ensure anchors included & unique
  const base: Player[] = [];
  const seen = new Set<string>();
  for (const a of anchors)
    if (!seen.has(a.id)) {
      base.push(a);
      seen.add(a.id);
    }
  filtered = filtered.filter((c) => !seen.has(c.id));

  // Fill up to 4
  const shuffled = randomShuffle(filtered);
  for (const c of shuffled) {
    if (base.length >= 4) break;
    base.push(c);
  }

  if (base.length < 4) {
    // Relax: allow any available (still respecting availability)
    const relaxed = candidates.filter(
      (c) => !seen.has(c.id) && !base.some((b) => b.id === c.id)
    );
    for (const r of randomShuffle(relaxed)) {
      if (base.length >= 4) break;
      base.push(r);
    }
  }

  return base.length === 4 ? base : null;
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
  // Remove players not available anymore
  e.queue = e.queue.filter((pid) => {
    const p = e.players.find((x) => x.id === pid)!;
    return isAvailableAt(p, at) && p.state !== PlayerState.Playing;
  });

  const picked: Player[] = [];
  while (picked.length < k && e.queue.length) {
    const pid = e.queue.shift()!;
    const p = e.players.find((x) => x.id === pid)!;
    if (isAvailableAt(p, at) && p.state !== PlayerState.Playing) {
      picked.push(p);
    }
  }
  return picked;
}

function removeFromQueue(e: Event, ids: string[]) {
  const rm = new Set(ids);
  e.queue = e.queue.filter((pid) => !rm.has(pid));
}

function purgeQueue(e: Event, at: string) {
  // เก็บ unique + ตัดคนที่ไม่พร้อม/กำลังเล่น ออกจากคิว
  const seen = new Set<string>();
  e.queue = e.queue.filter((pid) => {
    if (seen.has(pid)) return false;
    seen.add(pid);
    const p = e.players.find((x) => x.id === pid);
    return !!p && isAvailableAt(p, at) && p.state !== PlayerState.Playing;
  });
}

export const MatchingService = {
  createEvent(id: string, courts: number, players: Player[]): Event {
    const e: Event = {
      id,
      courts: Array.from({ length: courts }, (_, i) => ({
        id: `c${i + 1}`,
        currentGameId: null,
      })),
      createdAt: new Date().toISOString(),
      queue: [],
      games: [],
      players,
    };
    Store.upsertEvent(e);
    return e;
  },

  seedInitialGames(eventId: string, at: string) {
    const e = Store.getEvent(eventId);
    if (!e) throw new Error("Event not found");

    // Start by enqueuing everyone who is available at `at`
    const avail = e.players.filter((p) => isAvailableAt(p, at));
    enqueueIfWaiting(e, avail, at);
    purgeQueue(e, at); // ✅ กันคิวจากรอบก่อน ๆ และกันคนที่กำลัง Playing

    for (const court of e.courts) {
      if (court.currentGameId) continue;
      // Try to use 4 from queue that fit ±1
      const firstTwo = dequeueUpTo(e, 2, at);
      const anchors = firstTwo.length ? firstTwo : dequeueUpTo(e, 1, at); // at least 1 anchor if possible

      let group: Player[] | null = null;
      if (anchors.length) {
        group = buildGroup(anchors, e.players, at);
      } else {
        // no anchors, try any 4 available
        const candidates = e.players.filter(
          (p) => isAvailableAt(p, at) && p.state !== PlayerState.Playing
        );
        group = randomShuffle(candidates).slice(0, 4);
        if (group.length < 4) group = null;
      }

      if (group) {
        removeFromQueue(
          e,
          group.map((p) => p.id)
        ); // ✅ กันคิวค้าง
        const game = createGame(court, group, at);
        e.games.push(game);
        court.currentGameId = game.id;
        markPlaying(group, at);
      }
    }

    Store.upsertEvent(e);
    return e;
  },
  finishAndRefill(eventId: string, courtId: string, at: string) {
    const e = Store.getEvent(eventId);
    if (!e) throw new Error("Event not found");
    const court = e.courts.find((c) => c.id === courtId);
    if (!court) throw new Error("Court not found");

    // end current game
    if (court.currentGameId) {
      const g = e.games.find((x) => x.id === court.currentGameId)!;
      g.endTime = at;
      // Move players to waiting if still available
      const players = takeById(g.playerIds, e.players);
      for (const p of players) {
        p.state = PlayerState.Idle; // reset to idle first
      }
      enqueueIfWaiting(e, players, at);
      court.currentGameId = null;

      purgeQueue(e, at); // ✅ กันคิวจากรอบก่อน ๆ และกันคนที่กำลัง Playing
    }

    // Refill: pick 2 longest-waiting players first
    const anchors = dequeueUpTo(e, 2, at);

    // Add more potential anchors if still empty but queue exists
    if (anchors.length === 0 && e.queue.length > 0)
      anchors.push(...dequeueUpTo(e, 1, at));

    let group: Player[] | null = null;
    if (anchors.length) group = buildGroup(anchors, e.players, at);

    if (!group) {
      // fallback: any 4 available now
      const candidates = e.players.filter(
        (p) => isAvailableAt(p, at) && p.state !== PlayerState.Playing
      );
      group = randomShuffle(candidates).slice(0, 4);
      if (group.length < 4) group = null;
    }
    if (group) {
      removeFromQueue(
        e,
        group.map((p) => p.id)
      ); // ✅ กันคิวค้าง
      const game = createGame(court, group, at);
      e.games.push(game);
      court.currentGameId = game.id;
      markPlaying(group, at);
    }

    Store.upsertEvent(e);
    return e;
  },

  status(eventId: string) {
    const e = Store.getEvent(eventId);
    if (!e) throw new Error("Event not found");
    const status = {
      id: e.id,
      courts: e.courts.map((c) => ({
        id: c.id,
        currentGame: c.currentGameId
          ? e.games.find((g) => g.id === c.currentGameId)
          : null,
      })),
      queue: e.queue.map((pid) => e.players.find((p) => p.id === pid)),
      players: e.players,
    };
    return status;
  },
};
