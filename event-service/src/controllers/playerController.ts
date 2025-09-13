import { Request, Response } from "express";
import Player from "../models/Player";
import Event from "../models/Event";
import { RegisterByUser, RegisterByGuest } from "../types/event";
import messageQueueService from "../services/messageQueue";

interface ExtendedRequest extends Request {
  headers: Request["headers"] & {
    "x-user-id"?: string;
    "x-user-email"?: string;
    "x-user-name"?: string;
    "x-user-phone"?: string;
    "x-user-role"?: string;
  };
}

/**
 * @swagger
 * /api/events/{id}/players:
 *   get:
 *     summary: Get list of players for an event
 *     tags: [Registrations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [registered, waitlist, canceled]
 *         description: Filter by player status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 50
 *         description: Number of players to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: number
 *           default: 0
 *         description: Number of players to skip
 *     responses:
 *       200:
 *         description: List of players retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 eventId:
 *                   type: string
 *                 players:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       playerId:
 *                         type: string
 *                       userId:
 *                         type: string
 *                         nullable: true
 *                       name:
 *                         type: string
 *                         nullable: true
 *                       email:
 *                         type: string
 *                         nullable: true
 *                       startTime:
 *                         type: string
 *                         nullable: true
 *                       endTime:
 *                         type: string
 *                         nullable: true
 *                       status:
 *                         type: string
 *                         enum: [registered, waitlist, canceled]
 *                       registrationTime:
 *                         type: string
 *                         format: date-time
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     registered:
 *                       type: number
 *                     waitlist:
 *                       type: number
 *                     canceled:
 *                       type: number
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: number
 *                     offset:
 *                       type: number
 *                     hasMore:
 *                       type: boolean
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const getPlayers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id: eventId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    // ตรวจสอบว่า event มีอยู่จริง
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ 
        code: "EVENT_NOT_FOUND",
        message: "Event not found",
        details: { eventId }
      });
      return;
    }

    // สร้าง filter
    const filter: any = { eventId };
    if (status) filter.status = status;

    // ดึงข้อมูล players
    const players = await Player.find(filter)
      .sort({ registrationTime: 1 }) // เรียงตามเวลาสมัคร
      .limit(Number(limit))
      .skip(Number(offset));

    const total = await Player.countDocuments(filter);

    // จัดกลุ่มตาม status
    const groupedPlayers = {
      registered: players.filter(p => p.status === 'registered'),
      waitlist: players.filter(p => p.status === 'waitlist'),
      canceled: players.filter(p => p.status === 'canceled')
    };

    res.status(200).json({
      eventId,
      players: players.map(player => ({
        playerId: player.id,
        userId: player.userId || null,
        name: player.name || null,
        email: player.email || null,
        phoneNumber: player.phoneNumber,
        startTime: player.startTime || null,
        endTime: player.endTime || null,
        status: player.status,
        createdBy: (player as any).createdBy || null,
        registrationTime: player.registrationTime.toISOString()
      })),
      summary: {
        total,
        registered: groupedPlayers.registered.length,
        waitlist: groupedPlayers.waitlist.length,
        canceled: groupedPlayers.canceled.length
      },
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total
      }
    });
  } catch (error) {
    console.error("Get players error:", error);
    res.status(500).json({ 
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
      details: {}
    });
  }
};

/**
 * @swagger
 * /api/events/{id}/players/{pid}/cancel:
 *   post:
 *     summary: Cancel a player registration
 *     tags: [Registrations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *       - in: path
 *         name: pid
 *         required: true
 *         schema:
 *           type: string
 *         description: Player ID
 *     responses:
 *       200:
 *         description: Player registration canceled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 player:
 *                   type: object
 *                   properties:
 *                     playerId:
 *                       type: string
 *                     eventId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [canceled]
 *                     canceledAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request (already canceled, player not in event)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden (can only cancel own registration)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Event or player not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const cancelPlayerRegistration = async (
  req: ExtendedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: eventId, pid: playerId } = req.params;
    const userId = req.headers["x-user-id"];

    // ตรวจสอบว่า event มีอยู่จริง
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ 
        code: "EVENT_NOT_FOUND",
        message: "Event not found",
        details: { eventId }
      });
      return;
    }

    // ตรวจสอบว่า player มีอยู่จริง
    const player = await Player.findById(playerId);
    if (!player) {
      res.status(404).json({ 
        code: "PLAYER_NOT_FOUND",
        message: "Player registration not found",
        details: { playerId }
      });
      return;
    }

    // ตรวจสอบว่า player อยู่ใน event นี้
    if (player.eventId.toString() !== eventId) {
      res.status(400).json({ 
        code: "PLAYER_EVENT_MISMATCH",
        message: "Player is not registered for this event",
        details: { playerId, eventId }
      });
      return;
    }

    // ตรวจสอบสิทธิ์การยกเลิก
    const userRole = req.headers["x-user-role"];
    const isAdmin = userRole === "admin";

    // ถ้าไม่ใช่ admin
    if (!isAdmin) {
      // ถ้า player เป็น guest (ไม่มี userId) ไม่สามารถยกเลิกได้
      if (!player.userId) {
        res.status(403).json({
          code: "INSUFFICIENT_PERMISSIONS",
          message: "Only admin can cancel guest registrations",
          details: { playerId, playerType: "guest" }
        });
        return;
      }

      // ถ้า player เป็น user ต้องเป็นเจ้าของ registration
      if (userId && player.userId !== userId) {
        res.status(403).json({
          code: "INSUFFICIENT_PERMISSIONS",
          message: "You can only cancel your own registration",
          details: { playerId, requesterId: userId, ownerId: player.userId }
        });
        return;
      }
    }

    // ตรวจสอบสถานะปัจจุบัน
    if (player.status === 'canceled') {
      res.status(400).json({
        code: "ALREADY_CANCELED",
        message: "Player registration is already canceled",
        details: { playerId, currentStatus: player.status }
      });
      return;
    }

    // อัปเดตสถานะเป็น canceled
    const wasRegistered = player.status === 'registered';
    player.status = 'canceled';
    await player.save();

    // ถ้า player ที่ยกเลิกเป็นสถานะ 'registered' ให้ลด currentParticipants และเพิ่ม availableSlots
    if (wasRegistered) {
      await Event.findByIdAndUpdate(eventId, {
        $inc: { 
          "capacity.currentParticipants": -1,
          "capacity.availableSlots": 1
        }
      });

      // ตรวจสอบว่ามีคนใน waitlist หรือไม่ เพื่อเลื่อนขึ้นมา
      const waitlistPlayer = await Player.findOne({ 
        eventId, 
        status: 'waitlist' 
      }).sort({ registrationTime: 1 });

      if (waitlistPlayer) {
        waitlistPlayer.status = 'registered';
        await waitlistPlayer.save();

        // ไม่ต้องอัปเดต capacity เพราะเราเพิ่งเพิ่ม availableSlots แล้วลดลงอีกครั้ง
        await Event.findByIdAndUpdate(eventId, {
          $inc: { 
            "capacity.currentParticipants": 1,
            "capacity.availableSlots": -1
          }
        });
      }
    }

    // Publish participant.cancelled event
    try {
      await messageQueueService.publishEvent('participant.cancelled', {
        eventId,
        playerId: player.id,
        canceledBy: userId,
        wasRegistered,
        status: player.status,
        canceledAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to publish participant.cancelled event:', error);
      // Continue execution; do not fail the request because of messaging issues
    }

    res.status(200).json({
      message: "Player registration canceled successfully",
      player: {
        playerId: player.id,
        eventId: player.eventId.toString(),
        status: player.status,
        canceledAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Cancel player registration error:", error);
    res.status(500).json({ 
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
      details: {}
    });
  }
};

export const registerPlayer = async (
  req: ExtendedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: eventId } = req.params;
    const registrationData: RegisterByUser = req.body;

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

    const userId = req.headers["x-user-id"];
    const userName = req.headers["x-user-name"];
    const userEmail = req.headers["x-user-email"];

    if (!userId) {
      res.status(401).json({
        code: "AUTHENTICATION_REQUIRED",
        message: "User authentication required for player registration",
        details: { endpoint: "/api/events/{id}/players" }
      });
      return;
    }

    // Check for duplicate userId in this event (excluding canceled registrations)
    const existingUserPlayer = await Player.findOne({
      eventId,
      userId,
      status: { $ne: 'canceled' }
    });
    if (existingUserPlayer) {
      res.status(400).json({
        code: "PLAYER_ALREADY_REGISTERED",
        message: "User is already registered for this event",
        details: { eventId, userId }
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

    // Get phone number from user profile if available (optional for user registration)
    const userPhoneNumber = req.headers["x-user-phone"] as string;
    if (userPhoneNumber) {
      playerData.phoneNumber = userPhoneNumber;
    }

    if (registrationData.startTime) {
      playerData.startTime = registrationData.startTime;
    }
    if (registrationData.endTime) {
      playerData.endTime = registrationData.endTime;
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
        const earliestStartTime = startTimes.find(time => parseInt(time.replace(':', '')) === earliestStart) || '';
        const latestEndTime = endTimes.find(time => parseInt(time.replace(':', '')) === latestEnd) || '';
        
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

    // Publish event to RabbitMQ
    try {
      await messageQueueService.publishParticipantJoined({
        eventId,
        playerId: player.id,
        userId: player.userId || undefined,
        playerName: req.headers["x-user-name"] as string,
        playerEmail: req.headers["x-user-email"] as string,
        status: playerData.status as 'registered' | 'waitlist'
      });
    } catch (error) {
      console.error('Failed to publish participant joined event:', error);
      // Continue execution - don't fail the request due to messaging issues
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

export const registerGuest = async (
  req: ExtendedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: eventId } = req.params;
    const registrationData: RegisterByGuest = req.body;

    // Get admin user info from headers (injected by Gateway)
    const adminUserId = req.headers["x-user-id"];
    const adminRole = req.headers["x-user-role"];

    if (!adminUserId) {
      res.status(401).json({
        code: "AUTHENTICATION_REQUIRED",
        message: "Admin authentication required for guest registration",
        details: { endpoint: "/api/events/{id}/guests" }
      });
      return;
    }

    if (adminRole !== "admin") {
      res.status(403).json({
        code: "INSUFFICIENT_PERMISSIONS",
        message: "Admin privileges required to register guests",
        details: {
          currentRole: adminRole,
          requiredRole: "admin"
        }
      });
      return;
    }

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

    if (!registrationData.name) {
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Name is required for guest registration",
        details: {
          field: "name",
          required: true
        }
      });
      return;
    }

    if (!registrationData.phoneNumber) {
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Phone number is required for guest registration",
        details: {
          field: "phoneNumber",
          required: true
        }
      });
      return;
    }

    // Check for duplicate phone number in this event (excluding canceled registrations)
    const existingPhonePlayer = await Player.findOne({
      eventId,
      phoneNumber: registrationData.phoneNumber,
      status: { $ne: 'canceled' }
    });
    if (existingPhonePlayer) {
      res.status(400).json({
        code: "PLAYER_ALREADY_REGISTERED",
        message: "A player with this phone number is already registered for this event",
        details: { eventId, phoneNumber: registrationData.phoneNumber }
      });
      return;
    }

    let playerData: any = {
      eventId,
      name: registrationData.name,
      phoneNumber: registrationData.phoneNumber,
      registrationTime: new Date(),
      createdBy: adminUserId, // Admin user who created this guest registration
    };

    if (registrationData.startTime) {
      playerData.startTime = registrationData.startTime;
    }
    if (registrationData.endTime) {
      playerData.endTime = registrationData.endTime;
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

      // Validate that guest's time is within available court time slots
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

      // Check if guest's time is within the available court time range
      if (playerStartNum < earliestStart || playerEndNum > latestEnd) {
        const earliestStartTime = startTimes.find(time => parseInt(time.replace(':', '')) === earliestStart) || '';
        const latestEndTime = endTimes.find(time => parseInt(time.replace(':', '')) === latestEnd) || '';

        res.status(400).json({
          code: "TIME_OUTSIDE_COURT_HOURS",
          message: "Registration time must be within available court time slots",
          details: {
            guestStartTime: playerStart,
            guestEndTime: playerEnd,
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

    // Publish event to RabbitMQ
    try {
      await messageQueueService.publishParticipantJoined({
        eventId,
        playerId: player.id,
        userId: undefined, // Guests don't have userId
        playerName: registrationData.name,
        playerEmail: undefined, // Guests don't have email
        status: playerData.status as 'registered' | 'waitlist'
      });
    } catch (error) {
      console.error('Failed to publish guest joined event:', error);
      // Continue execution - don't fail the request due to messaging issues
    }

    const responsePlayer = {
      eventId: player.eventId.toString(),
      playerId: player.id,
      userId: null, // Guests don't have userId
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

    console.error("Register guest error:", error);
    res.status(500).json({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
      details: {}
    });
  }
};
