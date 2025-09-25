import Event from "../models/Event";
import { EventStatus } from "../types/event";
import {
  getLatestCourtEndTimestamp,
  hasEventStarted,
} from "../utils/eventTime";

const DEFAULT_INTERVAL_MS = 60_000;
let pendingConnectionLog = false;

export function startEventScheduler(): NodeJS.Timeout {
  const intervalMs = Number(process.env.SETTLEMENT_POLL_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);

  const runCheck = async () => {
    try {
      const isConnected = Event.db && Event.db.readyState === 1;
      if (!isConnected) {
        if (!pendingConnectionLog) {
          console.log("⏳ Event scheduler waiting for MongoDB connection...");
          pendingConnectionLog = true;
        }
        return;
      }
      pendingConnectionLog = false;

      console.log("⏰ Event scheduler checking events...");

      const now = Date.now();
      const upcomingEvents = await Event.find({ status: EventStatus.UPCOMING }).select(
        "eventDate courts"
      );

      if (upcomingEvents.length) {
        console.log(`📋 Found ${upcomingEvents.length} upcoming event(s) to check`);
        const toStart = upcomingEvents
          .map((event) => (hasEventStarted(event.eventDate, event.courts as any, now) ? event.id : null))
          .filter((id): id is string => Boolean(id));

        if (toStart.length) {
          const startResult = await Event.updateMany(
            { _id: { $in: toStart } },
            {
              $set: {
                status: EventStatus.IN_PROGRESS,
                updatedAt: new Date(),
              },
            }
          );

          if (startResult.modifiedCount > 0) {
            console.log(
              `▶️  Event Lifecycle Scheduler: moved ${startResult.modifiedCount} event(s) to in_progress`
            );
          }
        } else {
          console.log("⏸️  No upcoming events ready to start");
        }
      } else {
        console.log("📭 No upcoming events found");
      }

      const inProgressEvents = await Event.find({ status: EventStatus.IN_PROGRESS }).select(
        "eventDate courts"
      );

      if (inProgressEvents.length) {
        console.log(`🏃 Found ${inProgressEvents.length} in-progress event(s) to check`);
        const toCalculate = inProgressEvents
          .map((event) => {
            const latestEndTs = getLatestCourtEndTimestamp(event.eventDate, event.courts as any);
            return latestEndTs !== null && now >= latestEndTs ? event.id : null;
          })
          .filter((id): id is string => Boolean(id));

        if (toCalculate.length) {
          const updateResult = await Event.updateMany(
            { _id: { $in: toCalculate } },
            {
              $set: {
                status: EventStatus.CALCULATING,
                updatedAt: new Date(),
              },
            }
          );

          if (updateResult.modifiedCount > 0) {
            console.log(
              `⚙️  Event Lifecycle Scheduler: moved ${updateResult.modifiedCount} event(s) to calculating`
            );
          }
        } else {
          console.log("⏳ No in-progress events ready to calculate");
        }
      } else {
        console.log("📭 No in-progress events found");
      }
    } catch (error) {
      console.error("Event lifecycle scheduler failed:", error);
    }
  };

  runCheck();
  return setInterval(runCheck, Math.max(15_000, intervalMs));
}

export function stopEventScheduler(timer: NodeJS.Timeout | null) {
  if (timer) {
    clearInterval(timer);
  }
}
