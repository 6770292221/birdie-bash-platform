import { SkillRank, PlayerState } from "./enums";

export type ISODate = string; // e.g. "2025-09-16T20:00:00+07:00"

export interface Player {
  id: string;
  name: string;
  skill: SkillRank;
  availableStart: ISODate; // arrival time
  availableEnd: ISODate; // leave time
  gamesPlayed: number;
  lastPlayedAt?: ISODate | null;
  state: PlayerState;
  waitingSince?: ISODate | null; // when moved to queue
}

export interface Court {
  id: string;
  currentGameId?: string | null;
}

export interface Game {
  id: string;
  courtId: string;
  playerIds: string[]; // size 4
  startTime: ISODate;
  endTime?: ISODate | null; // set when finished
}

export interface Event {
  id: string;
  courts: Court[];
  createdAt: ISODate;
  queue: string[]; // playerIds (FIFO)
  games: Game[];
  players: Player[];
}
