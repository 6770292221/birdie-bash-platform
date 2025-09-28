import Event from "../models/Event";
import { EventStatus } from "../types/event";
import {
  getLatestCourtEndTimestamp,
  hasEventStarted,
} from "../utils/eventTime";

const DEFAULT_INTERVAL_MS = 60_000;
let pendingConnectionLog = false;

const REGISTRATION_SERVICE_URL = process.env.REGISTRATION_SERVICE_URL || 'http://localhost:3005';

async function checkEventHasPlayers(eventId: string): Promise<boolean> {
  try {
    const response = await fetch(`${REGISTRATION_SERVICE_URL}/api/registration/events/${eventId}/players?limit=1&offset=0`);

    if (response.status === 404) {
      // EVENT_NOT_FOUND means no players registered
      return false;
    }

    if (!response.ok) {
      console.warn(`Failed to check players for event ${eventId}: ${response.status}`);
      return true; // Default to true to avoid canceling on API errors
    }

    const data = await response.json();
    return data.players && data.players.length > 0;
  } catch (error) {
    console.error(`Error checking players for event ${eventId}:`, error);
    return true; // Default to true to avoid canceling on network errors
  }
}

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
          // Check which events have players and which don't
          const eventsToCancel = [];
          const eventsToCalculate = [];

          for (const eventId of toCalculate) {
            const hasPlayers = await checkEventHasPlayers(eventId);

            if (!hasPlayers) {
              eventsToCancel.push(eventId);
            } else {
              eventsToCalculate.push(eventId);
            }
          }

          // Update events with no players to canceled
          if (eventsToCancel.length > 0) {
            const cancelResult = await Event.updateMany(
              { _id: { $in: eventsToCancel } },
              {
                $set: {
                  status: EventStatus.CANCELED,
                  updatedAt: new Date(),
                },
              }
            );

            if (cancelResult.modifiedCount > 0) {
              console.log(
                `❌ Event Lifecycle Scheduler: canceled ${cancelResult.modifiedCount} event(s) with no players`
              );
            }
          }

          // Update events with players to calculating
          if (eventsToCalculate.length > 0) {
            const updateResult = await Event.updateMany(
              { _id: { $in: eventsToCalculate } },
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
