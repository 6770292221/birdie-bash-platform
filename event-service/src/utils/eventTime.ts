import { ICourtTime } from "../types/event";

export function getLatestCourtEndTimestamp(
  eventDate: string,
  courts: ICourtTime[] | undefined | null
): number | null {
  if (!courts || courts.length === 0) {
    return null;
  }

  let latest: number | null = null;

  for (const court of courts) {
    if (!court || !court.endTime) continue;
    const endDate = new Date(`${eventDate}T${court.endTime}:00`);
    if (Number.isNaN(endDate.getTime())) continue;
    const timestamp = endDate.getTime();
    latest = latest === null ? timestamp : Math.max(latest, timestamp);
  }

  return latest;
}

export function getEarliestCourtStartTimestamp(
  eventDate: string,
  courts: ICourtTime[] | undefined | null
): number | null {
  if (!courts || courts.length === 0) {
    return null;
  }

  let earliest: number | null = null;

  for (const court of courts) {
    if (!court || !court.startTime) continue;
    const startDate = new Date(`${eventDate}T${court.startTime}:00`);
    if (Number.isNaN(startDate.getTime())) continue;
    const timestamp = startDate.getTime();
    earliest = earliest === null ? timestamp : Math.min(earliest, timestamp);
  }

  return earliest;
}

export function hasEventEnded(
  eventDate: string,
  courts: ICourtTime[] | undefined | null,
  referenceTime: number = Date.now()
): boolean {
  const latestEnd = getLatestCourtEndTimestamp(eventDate, courts);
  return latestEnd !== null && referenceTime >= latestEnd;
}

export function hasEventStarted(
  eventDate: string,
  courts: ICourtTime[] | undefined | null,
  referenceTime: number = Date.now()
): boolean {
  const earliestStart = getEarliestCourtStartTimestamp(eventDate, courts);
  return earliestStart !== null && referenceTime >= earliestStart;
}
