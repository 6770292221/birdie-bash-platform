import { IEventCreate, IEventUpdate } from '../types/event';

function toDateOnly(value?: string | Date): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  // normalize to date-only (keep UTC date part)
  return new Date(d.toISOString().slice(0, 10));
}

function sanitizeState(state?: string): 'active' | 'canceled' | 'completed' | undefined {
  if (!state) return undefined;
  const s = state.toLowerCase();
  if (s === 'cancelled') return 'canceled';
  if (s === 'active' || s === 'canceled' || s === 'completed') return s as any;
  return undefined;
}

export function normalizeEventCreateInput(input: any): IEventCreate | null {
  if (!input || typeof input !== 'object') return null;

  // Detect alternative shape by presence of eventName/eventDate/location as string/courts
  const isAlt = !!(input.eventName || input.eventDate || Array.isArray(input.courts) || typeof input.location === 'string');

  if (!isAlt) {
    // Assume already matches IEventCreate
    return input as IEventCreate;
  }

  // Derive start/end time from time or courts
  let startTime: string | undefined = input.time?.startTime;
  let endTime: string | undefined = input.time?.endTime;
  if ((!startTime || !endTime) && Array.isArray(input.courts) && input.courts.length) {
    const times = input.courts
      .map((c: any) => ({ start: c.startTime, end: c.endTime }))
      .filter((t: any) => typeof t.start === 'string' && typeof t.end === 'string');
    if (times.length) {
      startTime = times.map((t: any) => (t as { start: string }).start).sort()[0];
      endTime = times.map((t: any) => (t as { end: string }).end).sort().slice(-1)[0];
    }
  }

  const capacity = input.capacity || {};
  const statusState = sanitizeState(input.status) || sanitizeState(input.status?.state);

  const normalized: IEventCreate = {
    name: input.eventName || input.name,
    description: input.description,
    time: {
      date: toDateOnly(input.eventDate || input.time?.date) as Date,
      startTime: startTime as string,
      endTime: endTime as string,
      durationMinutes: input.time?.durationMinutes,
    },
    location: typeof input.location === 'string' ? { name: input.location } : input.location,
    capacity: {
      maxParticipants: Number(capacity.maxParticipants ?? input.maxParticipants ?? 0),
      currentParticipants: Number(capacity.currentParticipants ?? input.currentParticipants ?? 0),
      // optional derived fields if provided; server will recalc
      availableSlots: capacity.availableSlots,
      waitlistEnabled: capacity.waitlistEnabled,
    },
    status: statusState ? { state: statusState } : undefined,
    payment: input.payment,
    costs: (input.shuttlecockPrice != null || input.courtHourlyRate != null)
      ? { shuttlecockPrice: input.shuttlecockPrice, courtHourlyRate: input.courtHourlyRate }
      : input.costs,
  } as IEventCreate;

  return normalized;
}

export function normalizeEventUpdateInput(input: any): IEventUpdate | null {
  if (!input || typeof input !== 'object') return null;
  const isAlt = !!(input.eventName || input.eventDate || Array.isArray(input.courts) || typeof input.location === 'string');
  if (!isAlt) return input as IEventUpdate;

  // Derive start/end time similar to create
  let startTime: string | undefined = input.time?.startTime;
  let endTime: string | undefined = input.time?.endTime;
  if ((!startTime || !endTime) && Array.isArray(input.courts) && input.courts.length) {
    const times = input.courts
      .map((c: any) => ({ start: c.startTime, end: c.endTime }))
      .filter((t: any) => typeof t.start === 'string' && typeof t.end === 'string');
    if (times.length) {
      startTime = times.map((t: any) => (t as { start: string }).start).sort()[0];
      endTime = times.map((t: any) => (t as { end: string }).end).sort().slice(-1)[0];
    }
  }

  const capacity = input.capacity || {};
  const statusState = sanitizeState(input.status) || sanitizeState(input.status?.state);

  const normalized: IEventUpdate = {
    name: input.eventName ?? input.name,
    description: input.description,
    time: {
      date: input.eventDate ? (toDateOnly(input.eventDate) as Date) : undefined,
      startTime,
      endTime,
      durationMinutes: input.time?.durationMinutes,
    },
    location: typeof input.location === 'string' ? { name: input.location } : input.location,
    capacity: {
      maxParticipants: capacity.maxParticipants ?? input.maxParticipants,
      currentParticipants: capacity.currentParticipants ?? input.currentParticipants,
      availableSlots: capacity.availableSlots,
      waitlistEnabled: capacity.waitlistEnabled,
    },
    status: statusState ? { state: statusState } : undefined,
    payment: input.payment,
    costs: input.costs ?? (
      (input.shuttlecockPrice != null || input.courtHourlyRate != null)
        ? { shuttlecockPrice: input.shuttlecockPrice, courtHourlyRate: input.courtHourlyRate }
        : undefined
    ),
  };

  return normalized;
}
