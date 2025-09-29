// src/models/types.ts
import { RuntimeState } from "./enums.js";

export type ISODate = string;


export interface Player {
  id: string;
  userId?: string | null;
  name: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  availableStart: ISODate;
  availableEnd: ISODate;
  registrationStatus: string;
  gamesPlayed: number;
}

export interface Court {
  id: string;
  currentGameId?: string | null;
  availableStart?: ISODate | null;
  availableEnd?: ISODate | null;  
  startHHmm?: string | null;     
  endHHmm?: string | null;        
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
  state: RuntimeState;         // Idle | Waiting | Playing
  gamesPlayed: number;
  lastPlayedAt?: ISODate | null;
  waitingSince?: ISODate | null;
}

export interface Event {
  id: string;
  courts: Court[];
  createdAt: ISODate;
  queue: string[];
  games: Game[];
  players: Player[];
  runtimes: Record<string, ParticipantRuntime>;
}
