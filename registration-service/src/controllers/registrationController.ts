import { Request, Response } from "express";
import Player from "../models/Player";
import { RegisterByUser, RegisterByGuest } from "../types/event";
import http from "http";
import https from "https";
import messageQueueService from "../queue/publisher";

interface ExtendedRequest extends Request {
  headers: Request["headers"] & {
    "x-user-id"?: string;
    "x-user-email"?: string;
    "x-user-name"?: string;
    "x-user-phone"?: string;
    "x-user-role"?: string;
  };
}

async function fetchEventById(eventId: string): Promise<any | null> {
  const base = process.env.EVENT_SERVICE_URL || "http://localhost:3002";
  const target = new URL(`/api/events/${eventId}`, base);
  console.log(`[fetchEventById] Calling: ${target.toString()}`);
  const lib = target.protocol === "https:" ? https : http;
  return new Promise((resolve) => {
    const req = lib.request(
      {
        method: "GET",
        hostname: target.hostname,
        port: target.port || (target.protocol === "https:" ? 443 : 80),
        path: target.pathname + (target.search || ""),
        headers: { Accept: "application/json" },
        timeout: 3000,
      },
      (res) => {
        const status = res.statusCode || 0;
        if (status === 404) {
          resolve(null);
          return;
        }
        if (status >= 400) {
          resolve(null);
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            const body = Buffer.concat(chunks).toString("utf8");
            const json = JSON.parse(body);
            resolve(json?.event || null);
          } catch (_e) {
            resolve(null);
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
      resolve(null);
    });
    req.end();
  });
}

async function fetchEventStatus(eventId: string): Promise<any | null> {
  const base = process.env.EVENT_SERVICE_URL || "http://localhost:3002";
  const target = new URL(`/api/events/${eventId}/status`, base);
  const lib = target.protocol === "https:" ? https : http;
  return new Promise((resolve) => {
    const req = lib.request(
      {
        method: "GET",
        hostname: target.hostname,
        port: target.port || (target.protocol === "https:" ? 443 : 80),
        path: target.pathname + (target.search || ""),
        headers: { Accept: "application/json" },
        timeout: 3000,
      },
      (res) => {
        const status = res.statusCode || 0;
        if (status === 404) {
          resolve(null);
          return;
        }
        if (status >= 400) {
          resolve(null);
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            const body = Buffer.concat(chunks).toString("utf8");
            const json = JSON.parse(body);
            resolve(json || null);
          } catch (_e) {
            resolve(null);
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
      resolve(null);
    });
    req.end();
  });
}

export const getPlayers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id: eventId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;
    const event = await fetchEventById(eventId);
    if (!event) {
      res.status(404).json({
        code: "EVENT_NOT_FOUND",
        message: "Event not found",
        details: { eventId },
      });
      return;
    }

    const filter: any = { eventId };
    if (status) filter.status = status;

    const players = await Player.find(filter)
      .sort({ registrationTime: 1 })
      .limit(Number(limit))
      .skip(Number(offset));

    const total = await Player.countDocuments(filter);

    const groupedPlayers = {
      registered: players.filter((p) => p.status === "registered"),
      waitlist: players.filter((p) => p.status === "waitlist"),
      canceled: players.filter((p) => p.status === "canceled"),
    };

    res.status(200).json({
      eventId,
      players: players.map((player) => ({
        playerId: player.id,
        userId: player.userId || null,
        name: player.name || null,
        email: player.email || null,
        phoneNumber: (player as any).phoneNumber,
        startTime: player.startTime || null,
        endTime: player.endTime || null,
        status: player.status,
        createdBy: (player as any).createdBy || null,
        registrationTime: player.registrationTime.toISOString(),
      })),
      summary: {
        total,
        registered: groupedPlayers.registered.length,
        waitlist: groupedPlayers.waitlist.length,
        canceled: groupedPlayers.canceled.length,
      },
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total,
      },
    });
  } catch (error) {
    console.error("Get players error:", error);
    res.status(500).json({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
      details: {},
    });
  }
};

export const cancelPlayerRegistration = async (
  req: ExtendedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: eventId, pid: playerId } = req.params;
    const userId = req.headers["x-user-id"];
    const event = await fetchEventById(eventId);
    if (!event) {
      res.status(404).json({
        code: "EVENT_NOT_FOUND",
        message: "Event not found",
        details: { eventId },
      });
      return;
    }

    const player = await Player.findById(playerId);
    if (!player) {
      res.status(404).json({
        code: "PLAYER_NOT_FOUND",
        message: "Player registration not found",
        details: { playerId },
      });
      return;
    }

    if (player.eventId.toString() !== eventId) {
      res.status(400).json({
        code: "PLAYER_EVENT_MISMATCH",
        message: "Player is not registered for this event",
        details: { playerId, eventId },
      });
      return;
    }

    const userRole = req.headers["x-user-role"];
    const isAdmin = userRole === "admin";

    if (!isAdmin) {
      if (!player.userId) {
        res.status(403).json({
          code: "INSUFFICIENT_PERMISSIONS",
          message: "Only admin can cancel guest registrations",
          details: { playerId, playerType: "guest" },
        });
        return;
      }
      if (userId && player.userId !== userId) {
        res.status(403).json({
          code: "INSUFFICIENT_PERMISSIONS",
          message: "You can only cancel your own registration",
          details: { playerId, requesterId: userId, ownerId: player.userId },
        });
        return;
      }
    }

    if (player.status === "canceled") {
      res.status(400).json({
        code: "ALREADY_CANCELED",
        message: "Player registration is already canceled",
        details: { playerId, currentStatus: player.status },
      });
      return;
    }

    const wasRegistered = player.status === "registered";
    player.status = "canceled";
    await player.save();
    // Capacity updates and waitlist promotion are handled by Event Service in a decoupled architecture.
    // Here we only update player state and emit domain events.

    try {
      await messageQueueService.publishEvent("participant.cancelled", {
        eventId,
        playerId: player.id,
        canceledBy: userId,
        wasRegistered,
        status: player.status,
        canceledAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to publish participant.cancelled event:", error);
    }

    res.status(200).json({
      message: "Player registration canceled successfully",
      player: {
        playerId: player.id,
        eventId: player.eventId.toString(),
        status: player.status,
        canceledAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Cancel player registration error:", error);
    res.status(500).json({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
      details: {},
    });
  }
};

export const registerMember = async (
  req: ExtendedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: eventId } = req.params;
    const registrationData: RegisterByUser = req.body;
    const event = await fetchEventById(eventId);
    if (!event) {
      res.status(404).json({
        code: "EVENT_NOT_FOUND",
        message: "Event not found",
        details: { eventId },
      });
      return;
    }
    const statusVal: any = (event as any).status;
    const isActive =
      typeof statusVal === "string"
        ? statusVal === "active"
        : statusVal?.state === "active";
    if (!isActive) {
      res.status(400).json({
        code: "REGISTRATION_CLOSED",
        message: "Event is not accepting registrations",
        details: {
          eventId,
          status: event.status,
          isAcceptingRegistrations: false,
        },
      });
      return;
    }

    const userId = req.headers["x-user-id"];
    const userName = req.headers["x-user-name"];
    const userEmail = req.headers["x-user-email"];

    if (!userId) {
      res.status(401).json({
        code: "AUTHENTICATION_REQUIRED",
        message: "User authentication required for player registration",
        details: { endpoint: "/api/events/{id}/players" },
      });
      return;
    }

    const existingUserPlayer = await Player.findOne({
      eventId,
      userId,
      status: { $ne: "canceled" },
    });
    if (existingUserPlayer) {
      res.status(400).json({
        code: "PLAYER_ALREADY_REGISTERED",
        message: "User is already registered for this event",
        details: { eventId, userId },
      });
      return;
    }

    let playerData: any = {
      eventId,
      userId,
      name: userName || "",
      email: userEmail || "",
      registrationTime: new Date(),
    };

    const userPhoneNumber = req.headers["x-user-phone"] as string;
    if (userPhoneNumber) {
      playerData.phoneNumber = userPhoneNumber;
    }

    if (registrationData.startTime)
      playerData.startTime = registrationData.startTime;
    if (registrationData.endTime) playerData.endTime = registrationData.endTime;

    // Validate time format HH:MM if provided
    const isHHMMGuest = (t: string) => /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(t);
    const guestTimeErrors: Record<string, string> = {};
    if (playerData.startTime && !isHHMMGuest(playerData.startTime)) {
      guestTimeErrors.startTime = `Invalid time format: ${playerData.startTime}. Expected HH:MM`;
    }
    if (playerData.endTime && !isHHMMGuest(playerData.endTime)) {
      guestTimeErrors.endTime = `Invalid time format: ${playerData.endTime}. Expected HH:MM`;
    }
    if (Object.keys(guestTimeErrors).length > 0) {
      res.status(400).json({ code: "VALIDATION_ERROR", message: "Invalid time format", details: guestTimeErrors });
      return;
    }

    // Validate time format HH:MM if provided
    const isHHMM = (t: string) => /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(t);
    const timeErrors: Record<string, string> = {};
    if (playerData.startTime && !isHHMM(playerData.startTime)) {
      timeErrors.startTime = `Invalid time format: ${playerData.startTime}. Expected HH:MM`;
    }
    if (playerData.endTime && !isHHMM(playerData.endTime)) {
      timeErrors.endTime = `Invalid time format: ${playerData.endTime}. Expected HH:MM`;
    }
    if (Object.keys(timeErrors).length > 0) {
      res
        .status(400)
        .json({ code: "VALIDATION_ERROR", message: "Invalid time format", details: timeErrors });
      return;
    }

    if (playerData.startTime && playerData.endTime) {
      const startTime = new Date(`1970-01-01T${playerData.startTime}:00`);
      const endTime = new Date(`1970-01-01T${playerData.endTime}:00`);
      if (startTime >= endTime) {
        res
          .status(400)
          .json({
            code: "VALIDATION_ERROR",
            message: "Start time must be less than end time",
            details: {
              startTime: playerData.startTime,
              endTime: playerData.endTime,
            },
          });
        return;
      }

      // Ensure requested time is within event court time slots
      const courtTimeSlots = (event as any).courts || [];
      if (courtTimeSlots.length === 0) {
        res.status(400).json({
          code: "NO_COURT_AVAILABLE",
          message: "No court time slots available for this event",
          details: { eventId },
        });
        return;
      }

      const toNum = (t: string) => parseInt(t.replace(":", ""));
      const startTimes = courtTimeSlots.map((c: any) => c.startTime);
      const endTimes = courtTimeSlots.map((c: any) => c.endTime);
      const earliestStart = Math.min(...startTimes.map(toNum));
      const latestEnd = Math.max(...endTimes.map(toNum));
      const playerStartNum = toNum(playerData.startTime);
      const playerEndNum = toNum(playerData.endTime);
      if (playerStartNum < earliestStart || playerEndNum > latestEnd) {
        const earliestStartTime = startTimes.find((t: string) => toNum(t) === earliestStart) || "";
        const latestEndTime = endTimes.find((t: string) => toNum(t) === latestEnd) || "";
        res.status(400).json({
          code: "TIME_OUTSIDE_COURT_HOURS",
          message: "Registration time must be within available court time slots",
          details: {
            memberStartTime: playerData.startTime,
            memberEndTime: playerData.endTime,
            availableTimeRange: { earliestStart: earliestStartTime, latestEnd: latestEndTime },
            courtTimeSlots,
          },
        });
        return;
      }
    }

    // Get real-time event status for accurate capacity
    const eventStatus = await fetchEventStatus(eventId);
    const capacity = eventStatus ? {
      maxParticipants: eventStatus.maxParticipants,
      currentParticipants: eventStatus.currentParticipants,
      availableSlots: eventStatus.availableSlots,
      waitlistEnabled: eventStatus.waitlistEnabled
    } : event.capacity;

    const availableSlots = Number(
      capacity?.availableSlots ??
        Math.max(
          0,
          Number(capacity?.maxParticipants ?? 0) -
            Number(capacity?.currentParticipants ?? 0)
        )
    );
    const waitlistEnabled = Boolean(capacity?.waitlistEnabled);

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
          maxParticipants: capacity?.maxParticipants,
          currentParticipants: capacity?.currentParticipants,
          availableSlots,
          waitlistEnabled,
        },
      });
      return;
    }

    const player = new Player(playerData);
    await player.save();

    // Capacity adjustments are managed by Event Service; skip local Event updates here.

    try {
      console.log('[registration] Publishing participant event', {
        eventId,
        playerId: player.id,
        userId: player.userId || undefined,
        status: playerData.status,
      });
      await messageQueueService.publishParticipantJoined({
        eventId,
        playerId: player.id,
        userId: player.userId || undefined,
        playerName: req.headers["x-user-name"] as string,
        playerEmail: req.headers["x-user-email"] as string,
        status: playerData.status as "registered" | "waitlist",
      });
      console.log('[registration] Published participant event OK');
    } catch (error) {
      console.error("Failed to publish participant joined event:", error);
    }

    res.status(201).json({
      eventId: player.eventId.toString(),
      playerId: player.id,
      userId: player.userId,
      registrationTime: player.registrationTime.toISOString(),
      status: player.status,
    });
  } catch (error: any) {
    if (error?.name === "ValidationError") {
      res
        .status(400)
        .json({ code: "VALIDATION_ERROR", message: error.message });
      return;
    }
    console.error("Register player error:", error);
    res
      .status(500)
      .json({
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
        details: {},
      });
  }
};

export const registerGuest = async (
  req: ExtendedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: eventId } = req.params;
    const registrationData: RegisterByGuest = req.body;

    const adminUserId = req.headers["x-user-id"];
    const adminRole = req.headers["x-user-role"];
    if (!adminUserId) {
      res
        .status(401)
        .json({
          code: "AUTHENTICATION_REQUIRED",
          message: "Admin authentication required for guest registration",
          details: { endpoint: "/api/events/{id}/guests" },
        });
      return;
    }
    if (adminRole !== "admin") {
      res
        .status(403)
        .json({
          code: "INSUFFICIENT_PERMISSIONS",
          message: "Admin privileges required to register guests",
          details: { currentRole: adminRole, requiredRole: "admin" },
        });
      return;
    }

    const event = await fetchEventById(eventId);
    if (!event) {
      res
        .status(404)
        .json({
          code: "EVENT_NOT_FOUND",
          message: "Event not found",
          details: { eventId },
        });
      return;
    }

    const statusVal: any = (event as any).status;
    const isActive =
      typeof statusVal === "string"
        ? statusVal === "active"
        : statusVal?.state === "active";
    if (!isActive) {
      res
        .status(400)
        .json({
          code: "REGISTRATION_CLOSED",
          message: "Event is not accepting registrations",
          details: {
            eventId,
            status: event.status,
            isAcceptingRegistrations: false,
          },
        });
      return;
    }

    if (!registrationData.name) {
      res
        .status(400)
        .json({
          code: "VALIDATION_ERROR",
          message: "Name is required for guest registration",
          details: { field: "name", required: true },
        });
      return;
    }
    if (!registrationData.phoneNumber) {
      res
        .status(400)
        .json({
          code: "VALIDATION_ERROR",
          message: "Phone number is required for guest registration",
          details: { field: "phoneNumber", required: true },
        });
      return;
    }

    const existingPhonePlayer = await Player.findOne({
      eventId,
      phoneNumber: registrationData.phoneNumber,
      status: { $ne: "canceled" },
    });
    if (existingPhonePlayer) {
      res
        .status(400)
        .json({
          code: "PLAYER_ALREADY_REGISTERED",
          message:
            "A player with this phone number is already registered for this event",
          details: { eventId, phoneNumber: registrationData.phoneNumber },
        });
      return;
    }

    let playerData: any = {
      eventId,
      name: registrationData.name,
      phoneNumber: registrationData.phoneNumber,
      registrationTime: new Date(),
      createdBy: adminUserId,
    };
    if (registrationData.startTime)
      playerData.startTime = registrationData.startTime;
    if (registrationData.endTime) playerData.endTime = registrationData.endTime;

    if (playerData.startTime && playerData.endTime) {
      const startTime = new Date(`1970-01-01T${playerData.startTime}:00`);
      const endTime = new Date(`1970-01-01T${playerData.endTime}:00`);
      if (startTime >= endTime) {
        res
          .status(400)
          .json({
            code: "VALIDATION_ERROR",
            message: "Start time must be less than end time",
            details: {
              startTime: playerData.startTime,
              endTime: playerData.endTime,
            },
          });
        return;
      }

      const playerStart = playerData.startTime;
      const playerEnd = playerData.endTime;
      const courtTimeSlots = (event as any).courts || [];
      if (courtTimeSlots.length === 0) {
        res
          .status(400)
          .json({
            code: "NO_COURT_AVAILABLE",
            message: "No court time slots available for this event",
            details: { eventId },
          });
        return;
      }
      const startTimes = courtTimeSlots.map((c: any) => c.startTime);
      const endTimes = courtTimeSlots.map((c: any) => c.endTime);
      const startTimeNumbers = startTimes.map((t: string) =>
        parseInt(t.replace(":", ""))
      );
      const endTimeNumbers = endTimes.map((t: string) =>
        parseInt(t.replace(":", ""))
      );
      const earliestStart = Math.min(...startTimeNumbers);
      const latestEnd = Math.max(...endTimeNumbers);
      const playerStartNum = parseInt(playerStart.replace(":", ""));
      const playerEndNum = parseInt(playerEnd.replace(":", ""));
      if (playerStartNum < earliestStart || playerEndNum > latestEnd) {
        const earliestStartTime =
          startTimes.find(
            (t: string) => parseInt(t.replace(":", "")) === earliestStart
          ) || "";
        const latestEndTime =
          endTimes.find(
            (t: string) => parseInt(t.replace(":", "")) === latestEnd
          ) || "";
        res
          .status(400)
          .json({
            code: "TIME_OUTSIDE_COURT_HOURS",
            message:
              "Registration time must be within available court time slots",
            details: {
              guestStartTime: playerStart,
              guestEndTime: playerEnd,
              availableTimeRange: {
                earliestStart: earliestStartTime,
                latestEnd: latestEndTime,
              },
              courtTimeSlots,
            },
          });
        return;
      }
    }

    // Get real-time event status for accurate capacity
    const eventStatus = await fetchEventStatus(eventId);
    const capacity = eventStatus ? {
      maxParticipants: eventStatus.maxParticipants,
      currentParticipants: eventStatus.currentParticipants,
      availableSlots: eventStatus.availableSlots,
      waitlistEnabled: eventStatus.waitlistEnabled
    } : event.capacity;

    const availableSlots = Number(
      capacity?.availableSlots ??
        Math.max(
          0,
          Number(capacity?.maxParticipants ?? 0) -
            Number(capacity?.currentParticipants ?? 0)
        )
    );
    const waitlistEnabled = Boolean(capacity?.waitlistEnabled);

    if (availableSlots > 0) {
      playerData.status = "registered";
    } else if (waitlistEnabled) {
      playerData.status = "waitlist";
    } else {
      res
        .status(400)
        .json({
          code: "EVENT_FULL",
          message: "Event is full and waitlist is not enabled",
          details: {
            eventId,
            maxParticipants: capacity?.maxParticipants,
            currentParticipants: capacity?.currentParticipants,
            availableSlots,
            waitlistEnabled,
          },
        });
      return;
    }

    const player = new Player(playerData);
    await player.save();

    // Capacity adjustments are managed by Event Service; skip local Event updates here.

    try {
      console.log('[registration] Publishing participant event (guest)', {
        eventId,
        playerId: player.id,
        status: playerData.status,
      });
      await messageQueueService.publishParticipantJoined({
        eventId,
        playerId: player.id,
        userId: undefined,
        playerName: registrationData.name,
        playerEmail: undefined,
        status: playerData.status as "registered" | "waitlist",
      });
      console.log('[registration] Published participant event (guest) OK');
    } catch (error) {
      console.error("Failed to publish participant joined event:", error);
    }

    res.status(201).json({
      eventId: player.eventId.toString(),
      playerId: player.id,
      userId: null,
      registrationTime: player.registrationTime.toISOString(),
      status: player.status,
    });
  } catch (error: any) {
    if (error?.name === "ValidationError") {
      res
        .status(400)
        .json({ code: "VALIDATION_ERROR", message: error.message });
      return;
    }
    console.error("Register guest error:", error);
    res
      .status(500)
      .json({
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
        details: {},
      });
  }
};
