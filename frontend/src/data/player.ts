export interface Player {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  skillLevel?: 'P' | 'S' | 'BG' | 'N';
  availableStart?: string; // เปลี่ยนเป็น optional
  availableEnd?: string;   // เปลี่ยนเป็น optional
  registrationStatus?: string;
  gamesPlayed?: number;    // เปลี่ยนเป็น optional
  lastPlayedAt?: string | null;
  state?: PlayerState;     // เปลี่ยนเป็น optional
  waitingSince?: string | null;
  // เพิ่ม properties ที่ใช้ใน EventManagement
  startTime?: string;
  endTime: string;
  registrationTime?: Date;
  status?: 'registered' | 'cancelled' | 'waitlisted';
  userId?: string;
  cancelledOnEventDay?: boolean;
}

export enum PlayerState {
  Idle = 'Idle',
  Waiting = 'Waiting',
  Playing = 'Playing',
  Available = 'Available'
}

export interface Court {
  id?: string;
  name?: string;
  courtNumber: number;
  startTime: string;
  endTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  location?: string;
}

export interface Event {
  id: string;
  eventName: string;
  eventDate: string;
  location: string;
  status: EventStatusType;
  courts: Court[];
  players: Player[];
  capacity?: {
    currentParticipants: number;
    maxParticipants: number;
  };
  // เพิ่ม properties ที่ใช้ใน EventManagement
  shuttlecocksUsed?: number;
  shuttlecockPrice: number;
  courtHourlyRate: number;
}

export type EventStatusType = 
  | 'upcoming' 
  | 'in_progress' 
  | 'calculating' 
  | 'awaiting_payment' 
  | 'completed' 
  | 'canceled';