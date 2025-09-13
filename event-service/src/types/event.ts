export type EventStatus = 'active' | 'canceled' | 'completed';
export type PlayerStatus = 'registered' | 'waitlist' | 'canceled';

export interface TimeInfo {
  date: Date;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  durationMinutes?: number;
}

export interface LocationInfo {
  name?: string;
  mapUrl?: string;
}

export interface CapacityInfo {
  maxParticipants: number;
  currentParticipants: number;
  availableSlots: number;
  waitlistEnabled: boolean;
}

// StatusInfo is no longer used - status is now a simple string

export interface PaymentInfo {
  pricePerPerson?: number;
  currency?: string;
  paymentRequired?: boolean;
  cancellationPolicy?: string;
}

export interface CostsInfo {
  shuttlecockPrice?: number;
  courtHourlyRate?: number;
}

export interface IEvent {
  id: string;
  eventName: string;
  eventDate: string;
  location: string;
  status: EventStatus;
  capacity: CapacityInfo;
  shuttlecockPrice: number;
  courtHourlyRate: number;
  courts: ICourtTime[];
  createdBy?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface IEventCreate {
  eventName: string;
  eventDate: string;
  location: string;
  status?: EventStatus;
  capacity: Omit<CapacityInfo, 'availableSlots' | 'waitlistEnabled'> & {
    availableSlots?: number;
    waitlistEnabled?: boolean;
  };
  shuttlecockPrice: number;
  courtHourlyRate: number;
  courts: ICourtTime[];
}

export interface IEventUpdate {
  eventName?: string;
  eventDate?: string;
  location?: string;
  capacity?: Partial<CapacityInfo>;
  status?: EventStatus;
  shuttlecockPrice?: number;
  courtHourlyRate?: number;
  courts?: ICourtTime[];
}

export interface ICourtTime {
  courtNumber: number;
  startTime: string;
  endTime: string;
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

export interface RegisterByUser {
  startTime?: string;
  endTime?: string;
}

export interface RegisterByGuest {
  name: string;
  email?: string;
  startTime?: string;
  endTime?: string;
}
