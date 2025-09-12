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

export interface StatusInfo {
  state: EventStatus;
  isAcceptingRegistrations: boolean;
}

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
  status: StatusInfo;
  capacity: CapacityInfo;
  shuttlecockPrice: number;
  courtHourlyRate: number;
  courts: ICourtTime[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface IEventCreate {
  id?: string;
  eventName: string;
  eventDate: string;
  location: string;
  status?: StatusInfo;
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
  status?: Partial<StatusInfo> & { state?: EventStatus };
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
