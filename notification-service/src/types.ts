// src/types.ts
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

// ------- Helpers (type guards) -------
export const isCreated = (m: EventMessage): m is EventCreated => m.eventType === "created";
export const isUpdated = (m: EventMessage): m is EventUpdated => m.eventType === "updated";
export const isDeleted = (m: EventMessage): m is EventDeleted => m.eventType === "deleted";
