import { Event } from "./types";

const db = new Map<string, Event>();

export const Store = {
  upsertEvent(e: Event) {
    db.set(e.id, e);
  },
  getEvent(id: string) {
    return db.get(id);
  },
  allEvents() {
    return Array.from(db.values());
  },
};
