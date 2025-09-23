import { register } from "module";
import { RuntimeState } from './enums.js';

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
  registrationStatus: string; // 'registered' | 'waitlist' | 'canceled' | ...
  // ❌ ไม่มี skill แล้ว
}

export interface Court {
  id: string;
  currentGameId?: string | null;
}

export interface Game {
  id: string;
  courtId: string;
  playerIds: string[];
  startTime: ISODate;
  endTime?: ISODate | null;
}

export interface ParticipantRuntime {
  playerId: string;
  state: RuntimeState;         // Idle/Waiting/Playing (ของเราเอง)
  gamesPlayed: number;
  lastPlayedAt?: ISODate | null;
  waitingSince?: ISODate | null;
}

export interface Event {
  id: string;
  courts: Court[];
  createdAt: ISODate;
  queue: string[];             // playerIds (FIFO)
  games: Game[];
  players: Player[];           // ข้อมูลจาก upstream
  runtimes: Record<string, ParticipantRuntime>; // <<< runtime ต่อคน
}

