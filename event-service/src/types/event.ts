export enum EventStatus {
  UPCOMING = 'upcoming',           // กำลังจะมาถึง
  IN_PROGRESS = 'in_progress',     // กำลังดำเนินการ
  CALCULATING = 'calculating',     // กำลังคำนวณ
  AWAITING_PAYMENT = 'awaiting_payment', // รอการชำระเงิน
  COMPLETED = 'completed',         // เสร็จสิ้น
  CANCELED = 'canceled'            // ยกเลิก
}

export type EventStatusType = 'upcoming' | 'in_progress' | 'calculating' | 'awaiting_payment' | 'completed' | 'canceled';

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
  status: EventStatusType;
  capacity: CapacityInfo;
  shuttlecockPrice: number;
  courtHourlyRate: number;
  courts: ICourtTime[];
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface IEventCreate {
  eventName: string;
  eventDate: string;
  location: string;
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
  status?: EventStatusType;
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

