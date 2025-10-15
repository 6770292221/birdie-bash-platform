// ===== Event service (existing) =====
export type EventType = "created" | "updated" | "deleted";

interface EventBase<T extends EventType> {
  eventType: T;
  timestamp: string;            // ISO date-time
  service: "event-service";
}

export interface EventCreated extends EventBase<"created"> {
  data: {
    eventId: string;
    eventName?: string;
    eventDate?: string;         // ISO date
    location?: string;
    venue?: string;
    createdBy?: string;
  };
}

export interface EventUpdated extends EventBase<"updated"> {
  data: {
    eventId: string;
    updatedBy?: string;
    eventName?: string;
    eventDate?: string;         // ISO date
    location?: string;
    venue?: string;
  };
}

export interface EventDeleted extends EventBase<"deleted"> {
  data: {
    eventId: string;
    deletedBy?: string;
    eventName?: string;
    eventDate?: string;         // ISO date
    location?: string;
    venue?: string;
    status?: "canceled" | "deleted" | string; // เผื่อฝั่ง event-service ส่งสถานะมา
  };
}

export type EventMessage = EventCreated | EventUpdated | EventDeleted;

// ===== Registration service (new) =====
export interface ParticipantJoined {
  eventType: "participant.joined";
  timestamp: string;                         // ISO date-time
  service: "registration-service";
  data: {
    eventId: string;
    playerId: string;
    userType: "member" | "guest";
    status: "registered" | string;

    // member-only
    userId?: string;

    // common / guest-first
    playerName?: string;

    // optional contacts (guest ใช้ค่าจาก payload เท่านั้น)
    playerEmail?: string;
    playerPhone?: string;
  };
}

export interface ParticipantCancelled {
  eventType: "participant.cancelled";
  timestamp: string;                         // ISO date-time
  service: "registration-service";
  data: {
    eventId: string;
    playerId: string;
    status: "canceled" | string;
    canceledAt: string;                      // ISO date-time

    // ใครเป็นคนยกเลิก (อาจเป็น userId ของ member / หรือระบบ)
    canceledBy?: string;

    // เผื่อส่งชื่อผู้เล่นมาให้ด้วย (guest/member ก็ได้)
    playerName?: string;
  };
}

// รวมทุกข้อความที่ consumer อาจรับได้
export type AnyMessage = EventMessage | ParticipantJoined | ParticipantCancelled;

// ------- Helpers (type guards) -------
export const isCreated = (m: EventMessage): m is EventCreated => m.eventType === "created";
export const isUpdated = (m: EventMessage): m is EventUpdated => m.eventType === "updated";
export const isDeleted = (m: EventMessage): m is EventDeleted => m.eventType === "deleted";

export const isParticipantJoined = (m: AnyMessage | unknown): m is ParticipantJoined =>
  !!m &&
  (m as any).eventType === "participant.joined" &&
  (m as any).service === "registration-service";

export const isParticipantCancelled = (m: AnyMessage | unknown): m is ParticipantCancelled =>
  !!m &&
  (m as any).eventType === "participant.cancelled" &&
  (m as any).service === "registration-service";
