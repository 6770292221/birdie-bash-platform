import { register } from "module";

export type ISODate = string;

export enum PlayerState {
  Idle = 'Idle',
  Waiting = 'Waiting',
  Playing = 'Playing',
  Registered = 'Registered'
}

export interface Player {
  id: string;
  name: string | null;
  availableStart: ISODate;
  availableEnd: ISODate;
  gamesPlayed: number;
  lastPlayedAt?: ISODate | null;
  state: PlayerState;
  waitingSince?: ISODate | null;
  // ❌ ไม่มี skill แล้ว
}

export interface Court {
  id: string;
  currentGameId?: string | null;
}

export interface Game {
  id: string;
  courtId: string;
  playerIds: string[];   // size 4
  startTime: ISODate;
  endTime?: ISODate | null;
}

export interface Event {
  id: string;
  courts: Court[];
  createdAt: ISODate;
  queue: string[];       // playerIds (FIFO)
  games: Game[];
  players: Player[];
}
