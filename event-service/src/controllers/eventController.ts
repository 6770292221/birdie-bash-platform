import { Request, Response } from "express";
import Event from "../models/Event";
import {
  IEventCreate,
  IEventUpdate,
  ICourtTime,
  EventStatus,
  EventStatusType,
} from "../types/event";
import messageQueueService from "../queue/publisher";
import { getLatestCourtEndTimestamp } from "../utils/eventTime";

interface ExtendedRequest extends Request {
  headers: Request["headers"] & {
    "x-user-id"?: string;
    "x-user-email"?: string;
    "x-user-role"?: string;
  };
}

interface CourtValidationResult {
  isValid: boolean;
  errors: any;
}

function validateEventDate(eventDate: string): {
  isValid: boolean;
  error?: string;
} {
  // ตรวจสอบรูปแบบวันที่ YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(eventDate)) {
    return {
      isValid: false,
      error: `Invalid date format: ${eventDate}. Expected YYYY-MM-DD`,
    };
  }

  // ตรวจสอบว่าวันที่ valid หรือไม่
  const eventDateObj = new Date(eventDate + "T00:00:00.000Z");
  if (isNaN(eventDateObj.getTime())) {
    return {
      isValid: false,
      error: `Invalid date: ${eventDate}`,
    };
  }

  // ตรวจสอบว่าไม่ใช่วันที่ในอดีต (เทียบกับเวลาไทย)
  const nowBangkok = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
  const todayBangkok = new Date(nowBangkok.getFullYear(), nowBangkok.getMonth(), nowBangkok.getDate());
  const eventDateLocal = new Date(
    eventDateObj.getFullYear(),
    eventDateObj.getMonth(),
    eventDateObj.getDate()
  );

  if (eventDateLocal < todayBangkok) {
    return {
      isValid: false,
      error: `Event date cannot be in the past. Event date: ${eventDate}, Today: ${
        todayBangkok.toISOString().split("T")[0]
      }`,
    };
  }

  return { isValid: true };
}

function validateEventDateTime(
  eventDate: string,
  courts: ICourtTime[]
): { isValid: boolean; error?: string } {
  // ตรวจสอบวันที่ก่อน
  const dateValidation = validateEventDate(eventDate);
  if (!dateValidation.isValid) {
    return dateValidation;
  }

  // ใช้เวลาไทย (UTC+7) สำหรับการตรวจสอบ
  const nowBangkok = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
  const todayBangkok = new Date(nowBangkok.getFullYear(), nowBangkok.getMonth(), nowBangkok.getDate());
  const eventDateObj = new Date(eventDate + "T00:00:00.000Z");
  const eventDateLocal = new Date(eventDateObj.getFullYear(), eventDateObj.getMonth(), eventDateObj.getDate());

  // ตรวจสอบว่าเป็นวันนี้หรือวันในอดีต
  if (eventDateLocal.getTime() < todayBangkok.getTime()) {
    return {
      isValid: false,
      error: `Event date cannot be in the past. Event date: ${eventDate}, Today: ${todayBangkok.toISOString().split("T")[0]}`,
    };
  }

  if (eventDateLocal.getTime() === todayBangkok.getTime()) {
    // เป็นวันนี้ - ตรวจสอบเวลา
    const currentTimeMinutes = nowBangkok.getHours() * 60 + nowBangkok.getMinutes();
    const currentTimeString = nowBangkok.toTimeString().slice(0, 5);

    for (const court of courts) {
      let startMinutes = timeToMinutes(court.startTime);

      // ถ้าเป็นเวลาข้ามวัน (เช่น 23:00-01:00) ให้ถือว่าเริ่มวันถัดไป
      const endMinutes = timeToMinutes(court.endTime);
      if (endMinutes <= startMinutes) {
        // เวลาข้ามวัน - ให้ผ่าน validation เพราะเป็นวันถัดไป
        continue;
      }

      // ตรวจสอบเฉพาะเวลาในวันเดียวกัน
      if (startMinutes <= currentTimeMinutes) {
        return {
          isValid: false,
          error: `Court ${court.courtNumber} start time (${court.startTime}) cannot be in the past. Current time: ${currentTimeString}`,
        };
      }
    }
  }

  return { isValid: true };
}

function validateCourts(courts: ICourtTime[]): CourtValidationResult {
  const errors: any = {};

  // ตรวจสอบ courtNumber ซ้ำ
  const courtNumbers = courts.map((c) => c.courtNumber);
  const duplicateNumbers = courtNumbers.filter(
    (num, index) => courtNumbers.indexOf(num) !== index
  );
  if (duplicateNumbers.length > 0) {
    errors.duplicateCourtNumbers = duplicateNumbers;
  }

  // ตรวจสอบแต่ละ court
  courts.forEach((court, index) => {
    const courtErrors: any = {};

    // ตรวจสอบ courtNumber ต้องเป็นเลขบวก
    if (!court.courtNumber || court.courtNumber <= 0) {
      courtErrors.courtNumber = "Court number must be a positive integer";
    }

    // ตรวจสอบรูปแบบเวลา (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(court.startTime)) {
      courtErrors.startTime = `Invalid time format: ${court.startTime}. Expected HH:MM (24-hour format)`;
    }
    if (!timeRegex.test(court.endTime)) {
      courtErrors.endTime = `Invalid time format: ${court.endTime}. Expected HH:MM (24-hour format)`;
    }

    // ตรวจสอบ startTime < endTime (รองรับเวลาข้ามวัน)
    if (timeRegex.test(court.startTime) && timeRegex.test(court.endTime)) {
      const startMinutes = timeToMinutes(court.startTime);
      let endMinutes = timeToMinutes(court.endTime);

      // ถ้า endTime เป็น 00:00 หรือน้อยกว่า startTime แสดงว่าข้ามวัน
      if (endMinutes <= startMinutes) {
        endMinutes += 1440; // เพิ่ม 24 ชั่วโมง (1440 นาที)
      }

      // ตรวจสอบระยะเวลาขั้นต่ำ (30 นาที)
      const duration = endMinutes - startMinutes;
      if (duration < 30) {
        courtErrors.minimumDuration = `Court session must be at least 30 minutes. Current: ${duration} minutes`;
      }

      // ตรวจสอบระยะเวลาสูงสุด (ไม่เกิน 12 ชั่วโมง)
      if (duration > 720) {
        courtErrors.maximumDuration = `Court session cannot exceed 12 hours. Current: ${duration} minutes`;
      }

      // ตรวจสอบเวลาสมเหตุสมผล (6:00-24:00)
      // เดิมเคยบังคับเวลาเปิดสนาม (เช่น เปิดหลัง 06:00 และปิดก่อน 24:00)
      // ปัจจุบันยกเลิกเงื่อนไขนี้เพื่อให้ผู้ใช้สามารถกำหนดเวลาได้ยืดหยุ่นมากขึ้น
    }

    if (Object.keys(courtErrors).length > 0) {
      errors[`court_${index + 1}`] = courtErrors;
    }
  });

  // ตรวจสอบการซ้อนทับของเวลาในสนามเดียวกัน
  const timeOverlaps = findTimeOverlaps(courts);
  if (timeOverlaps.length > 0) {
    errors.timeOverlaps = timeOverlaps;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };
}

function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function findTimeOverlaps(courts: ICourtTime[]): any[] {
  const overlaps: any[] = [];

  for (let i = 0; i < courts.length; i++) {
    for (let j = i + 1; j < courts.length; j++) {
      const court1 = courts[i];
      const court2 = courts[j];

      // ถ้าเป็นสนามเดียวกัน ตรวจสอบการซ้อนทับ
      if (court1.courtNumber === court2.courtNumber) {
        const start1 = timeToMinutes(court1.startTime);
        let end1 = timeToMinutes(court1.endTime);
        const start2 = timeToMinutes(court2.startTime);
        let end2 = timeToMinutes(court2.endTime);

        // ปรับ endTime สำหรับเวลาข้ามวัน
        if (end1 <= start1) end1 += 1440;
        if (end2 <= start2) end2 += 1440;

        // ตรวจสอบการซ้อนทับ (รองรับเวลาข้ามวัน)
        if (start1 < end2 && start2 < end1) {
          overlaps.push({
            court: court1.courtNumber,
            session1: `${court1.startTime}-${court1.endTime}`,
            session2: `${court2.startTime}-${court2.endTime}`,
            message: `Court ${court1.courtNumber} has overlapping time slots`,
          });
        }
      }
    }
  }

  return overlaps;
}

export const createEvent = async (
  req: ExtendedRequest,
  res: Response
): Promise<void> => {
  /**
   * @swagger
   * /api/events:
   *   post:
   *     summary: Create a new event
   *     tags: [Events]
   *     security:
   *       - BearerAuth: []
   *     description: |
   *       Create a new event. Requires admin privileges.
   *       Authorization is handled by Gateway - user headers are automatically forwarded.
   *     parameters:
   *       - in: header
   *         name: x-user-id
   *         required: false
   *         schema:
   *           type: string
   *         description: User ID set by Gateway after JWT validation. Optional here; required only if calling the service directly without Gateway.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/EventCreate'
   *     responses:
   *       201:
   *         description: Event created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 event:
   *                   $ref: '#/components/schemas/Event'
   *       400:
   *         description: Bad request (validation error)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: Unauthorized (missing or invalid JWT token)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: Forbidden (requires admin privileges)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       409:
   *         description: Duplicate event (same name, date, location)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  try {
    const eventData: IEventCreate = req.body;
    const userId = req.headers["x-user-id"];

    if (!userId) {
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "x-user-id header is required",
        details: { field: "x-user-id", required: true },
      });
      return;
    }

    // Validate event date
    const dateValidation = validateEventDate(eventData.eventDate);
    if (!dateValidation.isValid) {
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Invalid event date",
        details: { eventDate: dateValidation.error },
      });
      return;
    }

    // Validate courts data
    if (eventData.courts && eventData.courts.length > 0) {
      // Validate date and time together
      const dateTimeValidation = validateEventDateTime(
        eventData.eventDate,
        eventData.courts
      );
      if (!dateTimeValidation.isValid) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Invalid event date/time",
          details: { eventDateTime: dateTimeValidation.error },
        });
        return;
      }

      const courtValidation = validateCourts(eventData.courts);
      if (!courtValidation.isValid) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Invalid courts configuration",
          details: courtValidation.errors,
        });
        return;
      }
    }

    const { status: _ignoredStatus, ...payload } = eventData as IEventCreate & {
      status?: EventStatusType;
    };
    const event = new Event({
      ...payload,
      status: EventStatus.UPCOMING,
      createdBy: userId,
    });
    await event.save();

    // Publish RabbitMQ message: event.created (routingKey: event.created)
    try {
      await messageQueueService.publishEvent("created", {
        eventId: event.id,
        eventName: event.eventName,
        eventDate: event.eventDate,
        location: event.location,
        venue: event.location,
        createdBy: event.createdBy || userId,
      });
    } catch (e) {
      console.error("Publish event.created failed:", e);
    }

    const availableSlotsAfter = event.capacity.availableSlots;
    const waitlistActiveAfter =
      event.capacity.waitlistEnabled === true &&
      (event.status === EventStatus.UPCOMING ||
        event.status === EventStatus.IN_PROGRESS) &&
      availableSlotsAfter <= 0;

    res.status(201).json({
      message: "Event created successfully",
      event: {
        id: event.id,
        eventName: event.eventName,
        eventDate: event.eventDate,
        location: event.location,
        venue: event.location,
        status: event.status,
        capacity: event.capacity,
        waitlistActive: waitlistActiveAfter,
        shuttlecockPrice: event.shuttlecockPrice,
        courtHourlyRate: event.courtHourlyRate,
        courts: event.courts,
        createdBy: event.createdBy,
        updatedBy: (event as any).updatedBy,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      },
    });
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
    if (error?.code === 11000) {
      res.status(409).json({
        code: "EVENT_EXISTS",
        message: "An event with the same name and date already exists",
        details: error.keyValue,
      });
      return;
    }
    console.error("Create event error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Get list of events
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Retrieve a paginated list of events with optional filtering.
 *
 *       **Requirements:**
 *       - Valid JWT token via Authorization header
 *       - Any authenticated user can access this endpoint
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, canceled, completed]
 *         description: Filter events by status
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter events by date (YYYY-MM-DD)
 *       - in: query
 *         name: eventName
 *         schema:
 *           type: string
 *         description: Search events by name (case-insensitive partial match)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Number of events to return per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: number
 *           default: 0
 *           minimum: 0
 *         description: Number of events to skip for pagination
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                       description: Total number of events matching criteria
 *                     limit:
 *                       type: number
 *                       description: Number of events per page
 *                     offset:
 *                       type: number
 *                       description: Number of events skipped
 *                     hasMore:
 *                       type: boolean
 *                       description: Whether there are more events available
 *       400:
 *         description: Bad request (invalid query parameters)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const getEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, date, eventName, limit = 10, offset = 0 } = req.query;

    const filter: any = {};
    if (status) filter["status"] = status;
    if (date) filter.eventDate = date;
    if (eventName) filter.eventName = { $regex: eventName, $options: 'i' };

    const events = await Event.find(filter)
      .sort({ eventDate: 1, createdAt: 1 })
      .limit(Number(limit))
      .skip(Number(offset));

    const total = await Event.countDocuments(filter);

    res.status(200).json({
      events: events.map((event) => ({
        id: event.id,
        eventName: event.eventName,
        eventDate: event.eventDate,
        location: event.location,
        venue: event.location,
        status: event.status,
        capacity: event.capacity,
        waitlistActive:
          event.capacity.waitlistEnabled === true &&
          (event.status === EventStatus.UPCOMING ||
            event.status === EventStatus.IN_PROGRESS) &&
          (event.capacity.availableSlots ?? 0) <= 0,
        shuttlecockPrice: event.shuttlecockPrice,
        courtHourlyRate: event.courtHourlyRate,
        courts: event.courts,
        createdBy: (event as any).createdBy,
        updatedBy: (event as any).updatedBy,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      })),
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total,
      },
    });
  } catch (error) {
    console.error("Get events error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get event details by ID
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Retrieve detailed information about a specific event by its ID.
 *
 *       **Requirements:**
 *       - Valid JWT token via Authorization header
 *       - Any authenticated user can access this endpoint
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Event cannot be canceled in its current status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const getEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const available = event.capacity.availableSlots;
    const waitlistActive =
      event.capacity.waitlistEnabled === true &&
      (event.status === EventStatus.UPCOMING ||
        event.status === EventStatus.IN_PROGRESS) &&
      available <= 0;

    res.status(200).json({
      event: {
        id: event.id,
        eventName: event.eventName,
        eventDate: event.eventDate,
        location: event.location,
        venue: event.location,
        status: event.status,
        capacity: event.capacity,
        waitlistActive,
        shuttlecockPrice: event.shuttlecockPrice,
        courtHourlyRate: event.courtHourlyRate,
        courts: event.courts,
        createdBy: (event as any).createdBy,
        updatedBy: (event as any).updatedBy,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get event error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * @swagger
 * /api/events/{id}:
 *   patch:
 *     summary: Partially update an event (only specified fields)
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventUpdate'
 *           example:
 *             eventName: "Updated Event Name"
 *             capacity:
 *               maxParticipants: 25
 *     responses:
 *       200:
 *         description: Event updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 event:
 *                   $ref: '#/components/schemas/Event'
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Duplicate event (same name, date, location)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const updateEvent = async (
  req: ExtendedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: IEventUpdate = req.body;
    const userId = req.headers["x-user-id"];

    const event = await Event.findById(id);

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    // Validate event date if being updated
    if (updateData.eventDate) {
      const dateValidation = validateEventDate(updateData.eventDate);
      if (!dateValidation.isValid) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Invalid event date",
          details: { eventDate: dateValidation.error },
        });
        return;
      }
    }

    // Validate courts data if being updated
    if (updateData.courts && updateData.courts.length > 0) {
      // ใช้ eventDate ใหม่หรือเก่า
      const eventDateToUse = updateData.eventDate || event.eventDate;

      // Validate date and time together
      const dateTimeValidation = validateEventDateTime(
        eventDateToUse,
        updateData.courts
      );
      if (!dateTimeValidation.isValid) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Invalid event date/time",
          details: { eventDateTime: dateTimeValidation.error },
        });
        return;
      }

      const courtValidation = validateCourts(updateData.courts);
      if (!courtValidation.isValid) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Invalid courts configuration",
          details: courtValidation.errors,
        });
        return;
      }
    }

    // ถ้าแก้เฉพาะวันที่ (ไม่แก้ courts) ให้ตรวจสอบกับ courts เดิม
    if (
      updateData.eventDate &&
      (!updateData.courts || updateData.courts.length === 0) &&
      event.courts &&
      event.courts.length > 0
    ) {
      const dateTimeValidation = validateEventDateTime(
        updateData.eventDate,
        event.courts
      );
      if (!dateTimeValidation.isValid) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Invalid event date/time with existing courts",
          details: { eventDateTime: dateTimeValidation.error },
        });
        return;
      }
    }

    // เพิ่ม updatedBy จาก x-user-id header
    const updateDataWithUser = { ...updateData, updatedBy: userId };

    let updatedEvent: any;
    try {
      // ใช้ findById แล้ว save เพื่อให้ pre-save hook ทำงาน
      updatedEvent = await Event.findById(id);
      if (!updatedEvent) {
        res.status(404).json({ error: "Event not found" });
        return;
      }

      Object.assign(updatedEvent, updateDataWithUser);
      await updatedEvent.save();
    } catch (error: any) {
      if (error?.code === 11000) {
        res.status(409).json({
          code: "EVENT_EXISTS",
          message: "An event with the same name and date already exists",
          details: error.keyValue,
        });
        return;
      }
      throw error;
    }

    // Publish RabbitMQ message: event.updated
    try {
      await messageQueueService.publishEvent("updated", {
        eventId: updatedEvent!.id,
        updatedBy: userId,
        eventName: updatedEvent!.eventName,
        eventDate: updatedEvent!.eventDate,
        location: updatedEvent!.location,
        venue: updatedEvent!.location,
      });
    } catch (e) {
      console.error("Publish event.updated failed:", e);
    }

    res.status(200).json({
      message: "Event updated successfully",
      event: {
        id: updatedEvent!.id,
        eventName: updatedEvent!.eventName,
        eventDate: updatedEvent!.eventDate,
        location: updatedEvent!.location,
        venue: updatedEvent!.location,
        status: updatedEvent!.status,
        capacity: updatedEvent!.capacity,
        shuttlecockPrice: updatedEvent!.shuttlecockPrice,
        courtHourlyRate: updatedEvent!.courtHourlyRate,
        absentPenaltyFee: updatedEvent!.absentPenaltyFee,
        courts: updatedEvent!.courts,
        createdBy: (updatedEvent as any).createdBy,
        updatedBy: (updatedEvent as any).updatedBy,
        createdAt: updatedEvent!.createdAt,
        updatedAt: updatedEvent!.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update event error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     summary: Cancel an event
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Mark an event as canceled instead of removing it from the database. The event will
 *       no longer accept registrations, but historical data remains intact.
 *
 *       **Requirements:**
 *       - Valid JWT token with admin role
 *       - Only admin users can delete events
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event canceled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Event canceled successfully
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden (admin privileges required)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const deleteEvent = async (
  req: ExtendedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.headers["x-user-id"];

    const event = await Event.findById(id);

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    if (event.status !== EventStatus.UPCOMING) {
      res.status(400).json({
        error: "EVENT_NOT_CANCELABLE",
        message: "Only upcoming events can be canceled",
        status: event.status,
      });
      return;
    }

    event.status = EventStatus.CANCELED;
    if (userId) {
      (event as any).updatedBy = userId;
    }
    await event.save();

    // Publish RabbitMQ message: event.deleted (logical delete)
    try {
      await messageQueueService.publishEvent("deleted", {
        eventId: id,
        deletedBy: userId,
        eventName: event.eventName,
        eventDate: event.eventDate,
        location: event.location,
        venue: event.location,
        status: EventStatus.CANCELED,
      });
    } catch (e) {
      console.error("Publish event.deleted failed:", e);
    }

    res.status(200).json({
      message: "Event canceled successfully",
    });
  } catch (error) {
    console.error("Delete event error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * @swagger
 * /api/events/{id}/status:
 *   get:
 *     summary: Get event status and registration information
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Get event status including registration availability, participant counts, and waitlist information.
 *
 *       **Requirements:**
 *       - Valid JWT token via Authorization header
 *       - Any authenticated user can access this endpoint
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventStatus'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const getEventStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const availableSlots = event.capacity.availableSlots;
    const isAcceptingRegistrations =
      (event.status === EventStatus.UPCOMING ||
        event.status === EventStatus.IN_PROGRESS) &&
      availableSlots > 0;
    const waitlistActive =
      event.capacity.waitlistEnabled === true &&
      (event.status === EventStatus.UPCOMING ||
        event.status === EventStatus.IN_PROGRESS) &&
      availableSlots <= 0;

    res.status(200).json({
      id: event.id,
      status: event.status,
      maxParticipants: event.capacity.maxParticipants,
      currentParticipants: event.capacity.currentParticipants,
      availableSlots,
      isAcceptingRegistrations,
      waitlistEnabled: event.capacity.waitlistEnabled,
      waitlistActive,
    });
  } catch (error) {
    console.error("Get event status error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
