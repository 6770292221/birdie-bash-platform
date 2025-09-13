import { Request, Response } from "express";
import Player from "../models/Player";
import Event from "../models/Event";
import { RegisterByUser, RegisterByGuest } from "../types/event";

interface ExtendedRequest extends Request {
  headers: Request["headers"] & {
    "x-user-id"?: string;
    "x-user-email"?: string;
    "x-user-role"?: string;
  };
}

export const registerPlayer = async (
  req: ExtendedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: eventId } = req.params;
    const registrationData: RegisterByUser | RegisterByGuest = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ 
        code: "EVENT_NOT_FOUND",
        message: "Event not found",
        details: { eventId }
      });
      return;
    }

    const isAcceptingRegistrations = event.status === "active" && event.capacity.availableSlots > 0;
    
    if (!isAcceptingRegistrations) {
      res.status(400).json({ 
        code: "REGISTRATION_CLOSED",
        message: "Event is not accepting registrations",
        details: { 
          eventId,
          status: event.status,
          isAcceptingRegistrations
        }
      });
      return;
    }

    let playerData: any = {
      eventId,
      registrationTime: new Date(),
    };

    const userId = req.headers["x-user-id"];
    
    if (userId) {
      const registerByUser = registrationData as RegisterByUser;
      
      // Check for duplicate userId in this event
      const existingUserPlayer = await Player.findOne({ eventId, userId });
      if (existingUserPlayer) {
        res.status(409).json({
          code: "PLAYER_ALREADY_REGISTERED",
          message: "User is already registered for this event",
          details: { eventId, userId }
        });
        return;
      }
      
      playerData.userId = userId;
      playerData.name = "";
      
      if (registerByUser.startTime) {
        playerData.startTime = registerByUser.startTime;
      }
      if (registerByUser.endTime) {
        playerData.endTime = registerByUser.endTime;
      }
    } else {
      const registerByGuest = registrationData as RegisterByGuest;
      
      if (!registerByGuest.name) {
        res.status(400).json({ 
          code: "VALIDATION_ERROR",
          message: "Name is required when x-user-id header is not provided",
          details: { 
            field: "name",
            required: true
          }
        });
        return;
      }
      
      // Check for duplicate name in this event (for guests)
      const existingGuestPlayer = await Player.findOne({ 
        eventId, 
        name: registerByGuest.name,
        userId: { $exists: false }
      });
      if (existingGuestPlayer) {
        res.status(409).json({
          code: "PLAYER_ALREADY_REGISTERED",
          message: "Guest with this name is already registered for this event",
          details: { eventId, name: registerByGuest.name }
        });
        return;
      }
      
      playerData.name = registerByGuest.name;
      playerData.email = registerByGuest.email;
      
      if (registerByGuest.startTime) {
        playerData.startTime = registerByGuest.startTime;
      }
      if (registerByGuest.endTime) {
        playerData.endTime = registerByGuest.endTime;
      }
    }

    // Validate start time < end time
    if (playerData.startTime && playerData.endTime) {
      const startTime = new Date(`1970-01-01T${playerData.startTime}:00`);
      const endTime = new Date(`1970-01-01T${playerData.endTime}:00`);
      
      if (startTime >= endTime) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Start time must be less than end time",
          details: { 
            startTime: playerData.startTime,
            endTime: playerData.endTime
          }
        });
        return;
      }

      // Validate that player's time is within available court time slots
      const playerStart = playerData.startTime;
      const playerEnd = playerData.endTime;
      
      // Get all court time slots for this event
      const courtTimeSlots = event.courts || [];
      
      if (courtTimeSlots.length === 0) {
        res.status(400).json({
          code: "NO_COURT_AVAILABLE",
          message: "No court time slots available for this event",
          details: { eventId }
        });
        return;
      }

      // Find the earliest start time and latest end time from all courts
      const startTimes = courtTimeSlots.map(court => court.startTime);
      const endTimes = courtTimeSlots.map(court => court.endTime);
      
      const startTimeNumbers = startTimes.map(time => parseInt(time.replace(':', '')));
      const endTimeNumbers = endTimes.map(time => parseInt(time.replace(':', '')));
      
      const earliestStart = Math.min(...startTimeNumbers);
      const latestEnd = Math.max(...endTimeNumbers);
      
      const playerStartNum = parseInt(playerStart.replace(':', ''));
      const playerEndNum = parseInt(playerEnd.replace(':', ''));

      // Check if player's time is within the available court time range
      if (playerStartNum < earliestStart || playerEndNum > latestEnd) {
        const earliestStartTime = startTimes.find(time => parseInt(time.replace(':', '')) === earliestStart);
        const latestEndTime = endTimes.find(time => parseInt(time.replace(':', '')) === latestEnd);
        
        res.status(400).json({
          code: "TIME_OUTSIDE_COURT_HOURS",
          message: "Registration time must be within available court time slots",
          details: {
            playerStartTime: playerStart,
            playerEndTime: playerEnd,
            availableTimeRange: {
              earliestStart: earliestStartTime,
              latestEnd: latestEndTime
            },
            courtTimeSlots
          }
        });
        return;
      }
    }

    const availableSlots = event.capacity.availableSlots;
    const waitlistEnabled = event.capacity.waitlistEnabled;

    if (availableSlots > 0) {
      playerData.status = "registered";
    } else if (waitlistEnabled) {
      playerData.status = "waitlist";
    } else {
      res.status(400).json({ 
        code: "EVENT_FULL",
        message: "Event is full and waitlist is not enabled",
        details: { 
          eventId,
          maxParticipants: event.capacity.maxParticipants,
          currentParticipants: event.capacity.currentParticipants,
          availableSlots: event.capacity.availableSlots,
          waitlistEnabled: event.capacity.waitlistEnabled
        }
      });
      return;
    }

    const player = new Player(playerData);
    await player.save();

    if (playerData.status === "registered") {
      await Event.findByIdAndUpdate(eventId, {
        $inc: { 
          "capacity.currentParticipants": 1,
          "capacity.availableSlots": -1
        }
      });
    }

    const responsePlayer = {
      eventId: player.eventId.toString(),
      playerId: player.id,
      userId: player.userId,
      registrationTime: player.registrationTime.toISOString(),
      status: player.status
    };

    res.status(201).json(responsePlayer);
  } catch (error: any) {
    if (error?.name === "ValidationError") {
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: error.message,
        details: Object.fromEntries(
          Object.entries(error.errors || {}).map(([k, v]: any) => [
            k,
            { kind: (v as any).kind, message: (v as any).message },
          ])
        ),
      });
      return;
    }
    
    console.error("Register player error:", error);
    res.status(500).json({ 
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
      details: {}
    });
  }
};