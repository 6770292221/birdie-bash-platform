export const EVENTS = {
  PARTICIPANT_JOINED: 'participant.joined',
  WAITING_ADDED: 'waiting.added',
  PARTICIPANT_CANCELLED: 'participant.cancelled',
  WAITLIST_PROMOTED: 'waitlist.promoted',
} as const;

export type EventType = typeof EVENTS[keyof typeof EVENTS];

export function toRoutingKey(eventType: EventType): string {
  // Topic exchange routing key convention
  return `event.${eventType}`;
}

