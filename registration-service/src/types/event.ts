export type EventStatus =
  | 'upcoming'
  | 'in_progress'
  | 'calculating'
  | 'awaiting_payment'
  | 'completed'
  | 'canceled';
export type PlayerStatus = 'registered' | 'waitlist' | 'canceled';
export type UserType = 'member' | 'guest';

export interface CapacityInfo {
  maxParticipants: number;
  currentParticipants: number;
  availableSlots: number;
  waitlistEnabled: boolean;
}

export interface IEvent {
  id: string;
  eventName: string;
  eventDate: string;
  location: string;
  status: EventStatus | { state: EventStatus; isAcceptingRegistrations?: boolean };
  capacity: CapacityInfo;
  shuttlecockPrice: number;
  courtHourlyRate: number;
  courts: ICourtTime[];
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface RegisterByUser {
  startTime?: string;
  endTime?: string;
}

export interface RegisterByGuest {
  name: string;
  phoneNumber: string;
  startTime?: string;
  endTime?: string;
}

export interface ICourtTime {
  courtNumber: number;
  startTime: string;
  endTime: string;
}

export interface IPlayer {
  id: string;
  eventId: string;
  userId?: string;
  name: string;
  email: string;
  phoneNumber?: string;
  startTime?: string;
  endTime?: string;
  registrationTime: Date;
  status: PlayerStatus;
  userType: UserType;
  isPenalty: boolean;
  createdAt: Date;
  updatedAt: Date;
}
