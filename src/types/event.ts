export type EventStatus = 'active' | 'canceled' | 'completed';
export type PlayerStatus = 'registered' | 'waitlist' | 'canceled';

export interface IEvent {
  id: string;
  name: string;
  description?: string;
  date: Date;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  currentParticipants: number;
  status: EventStatus;
  location?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEventCreate {
  name: string;
  description?: string;
  date: Date;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  location?: string;
  createdBy: string;
}

export interface IEventUpdate {
  name?: string;
  description?: string;
  date?: Date;
  startTime?: string;
  endTime?: string;
  maxParticipants?: number;
  location?: string;
  status?: EventStatus;
}

export interface ICourt {
  id: string;
  eventId: string;
  courtNumber: number;
  maxPlayers: number;
  currentPlayers: number;
  status: 'available' | 'occupied' | 'maintenance';
  createdAt: Date;
  updatedAt: Date;
}

export interface ICourtCreate {
  eventId: string;
  courtNumber: number;
  maxPlayers: number;
}

export interface IPlayer {
  id: string;
  eventId: string;
  userId?: string;
  name: string;
  email: string;
  startTime?: string;
  endTime?: string;
  registrationTime: Date;
  status: PlayerStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPlayerRegister {
  userId?: string;
  name: string;
  email: string;
  startTime?: string;
  endTime?: string;
}