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
    // Use Bangkok timezone by appending +07:00
    const endDate = new Date(`${eventDate}T${court.endTime}:00+07:00`);
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
    console.log(`🔍 No courts found for event date: ${eventDate}`);
    return null;
  }

  let earliest: number | null = null;

  for (const court of courts) {
    if (!court || !court.startTime) continue;
    // Use Bangkok timezone by appending +07:00
    const dateTimeString = `${eventDate}T${court.startTime}:00+07:00`;
    const startDate = new Date(dateTimeString);

    if (Number.isNaN(startDate.getTime())) {
      console.log(`⚠️  Invalid date format: ${dateTimeString}`);
      continue;
    }

    const timestamp = startDate.getTime();
    console.log(`🕐 Court ${court.courtNumber}: ${court.startTime} → ${timestamp} (${startDate.toLocaleString('th-TH', {timeZone: 'Asia/Bangkok'})})`);
    earliest = earliest === null ? timestamp : Math.min(earliest, timestamp);
  }

  if (earliest) {
    console.log(`⏰ Earliest start time: ${new Date(earliest).toLocaleString()}`);
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
  const hasStarted = earliestStart !== null && referenceTime >= earliestStart;

  console.log(`🔍 Event Start Check:`);
  console.log(`   Event Date: ${eventDate}`);
  console.log(`   Current Time: ${new Date(referenceTime).toLocaleString('th-TH', {timeZone: 'Asia/Bangkok'})}`);
  console.log(`   Earliest Start: ${earliestStart ? new Date(earliestStart).toLocaleString('th-TH', {timeZone: 'Asia/Bangkok'}) : 'null'}`);
  console.log(`   Has Started: ${hasStarted}`);

  return hasStarted;
}
