import { Request, Response } from "express";
import Event from "../models/Event";
import { IEventCreate, IEventUpdate, ICourtTime } from "../types/event";

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

function validateEventDate(eventDate: string): { isValid: boolean; error?: string } {
  // ตรวจสอบรูปแบบวันที่ YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(eventDate)) {
    return {
      isValid: false,
      error: `Invalid date format: ${eventDate}. Expected YYYY-MM-DD`
    };
  }

  // ตรวจสอบว่าวันที่ valid หรือไม่
  const eventDateObj = new Date(eventDate + 'T00:00:00.000Z');
  if (isNaN(eventDateObj.getTime())) {
    return {
      isValid: false,
      error: `Invalid date: ${eventDate}`
    };
  }

  // ตรวจสอบว่าไม่ใช่วันที่ในอดีต (เทียบกับ UTC วันนี้)
  const today = new Date();
  const todayUTC = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const eventDateLocal = new Date(eventDateObj.getFullYear(), eventDateObj.getMonth(), eventDateObj.getDate());

  if (eventDateLocal < todayUTC) {
    return {
      isValid: false,
      error: `Event date cannot be in the past. Event date: ${eventDate}, Today: ${todayUTC.toISOString().split('T')[0]}`
    };
  }

  return { isValid: true };
}

function validateEventDateTime(eventDate: string, courts: ICourtTime[]): { isValid: boolean; error?: string } {
  // ตรวจสอบวันที่ก่อน
  const dateValidation = validateEventDate(eventDate);
  if (!dateValidation.isValid) {
    return dateValidation;
  }

  // ถ้าเป็นวันนี้ ตรวจสอบเวลาด้วย
  const eventDateObj = new Date(eventDate + 'T00:00:00.000Z');
  const today = new Date();
  const todayUTC = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const eventDateLocal = new Date(eventDateObj.getFullYear(), eventDateObj.getMonth(), eventDateObj.getDate());

  if (eventDateLocal.getTime() === todayUTC.getTime()) {
    // เป็นวันนี้ - ตรวจสอบเวลา
    const now = new Date();
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

    for (const court of courts) {
      const startMinutes = timeToMinutes(court.startTime);
      if (startMinutes <= currentTimeMinutes) {
        return {
          isValid: false,
          error: `Court ${court.courtNumber} start time (${court.startTime}) cannot be in the past. Current time: ${now.toTimeString().slice(0, 5)}`
        };
      }
    }
  }

  return { isValid: true };
}

function validateCourts(courts: ICourtTime[]): CourtValidationResult {
  const errors: any = {};
  
  // ตรวจสอบ courtNumber ซ้ำ
  const courtNumbers = courts.map(c => c.courtNumber);
  const duplicateNumbers = courtNumbers.filter((num, index) => courtNumbers.indexOf(num) !== index);
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
    
    // ตรวจสอบ startTime < endTime
    if (timeRegex.test(court.startTime) && timeRegex.test(court.endTime)) {
      const startMinutes = timeToMinutes(court.startTime);
      const endMinutes = timeToMinutes(court.endTime);
      
      if (startMinutes >= endMinutes) {
        courtErrors.timeRange = `Start time (${court.startTime}) must be before end time (${court.endTime})`;
      }
      
      // ตรวจสอบระยะเวลาขั้นต่ำ (30 นาที)
      if (endMinutes - startMinutes < 30) {
        courtErrors.minimumDuration = `Court session must be at least 30 minutes. Current: ${endMinutes - startMinutes} minutes`;
      }
      
      // ตรวจสอบเวลาสมเหตุสมผล (6:00-24:00)
      if (startMinutes < 360) { // ก่อน 6:00
        courtErrors.startTimeRealistic = `Start time too early: ${court.startTime}. Courts typically open after 6:00`;
      }
      if (endMinutes > 1440) { // หลัง 24:00
        courtErrors.endTimeRealistic = `End time too late: ${court.endTime}. Courts typically close before 24:00`;
      }
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
    errors: Object.keys(errors).length > 0 ? errors : undefined
  };
}

function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
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
        const end1 = timeToMinutes(court1.endTime);
        const start2 = timeToMinutes(court2.startTime);
        const end2 = timeToMinutes(court2.endTime);
        
        // ตรวจสอบการซ้อนทับ
        if ((start1 < end2 && start2 < end1)) {
          overlaps.push({
            court: court1.courtNumber,
            session1: `${court1.startTime}-${court1.endTime}`,
            session2: `${court2.startTime}-${court2.endTime}`,
            message: `Court ${court1.courtNumber} has overlapping time slots`
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
        details: { eventDate: dateValidation.error }
      });
      return;
    }

    // Validate courts data
    if (eventData.courts && eventData.courts.length > 0) {
      // Validate date and time together
      const dateTimeValidation = validateEventDateTime(eventData.eventDate, eventData.courts);
      if (!dateTimeValidation.isValid) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Invalid event date/time",
          details: { eventDateTime: dateTimeValidation.error }
        });
        return;
      }

      const courtValidation = validateCourts(eventData.courts);
      if (!courtValidation.isValid) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Invalid courts configuration",
          details: courtValidation.errors
        });
        return;
      }
    }

    // Ignore any client-provided id; it will be generated by MongoDB
    const { /* id: _ignored, */ ...payload } = eventData as any;
    const event = new Event({ ...payload, createdBy: userId });
    await event.save();

    res.status(201).json({
      message: "Event created successfully",
      event: {
        id: event.id,
        eventName: event.eventName,
        eventDate: event.eventDate,
        location: event.location,
        status: event.status,
        capacity: event.capacity,
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
        message:
          "An event with the same name, date and location already exists",
        details: error.keyValue,
      });
      return;
    }
    console.error("Create event error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, date, limit = 10, offset = 0 } = req.query;

    const filter: any = {};
    if (status) filter["status"] = status;
    if (date) filter.eventDate = date;

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
        status: event.status,
        capacity: event.capacity,
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

export const getEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    res.status(200).json({
      event: {
        id: event.id,
        eventName: event.eventName,
        eventDate: event.eventDate,
        location: event.location,
        status: event.status,
        capacity: event.capacity,
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
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: IEventUpdate = req.body;

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
          details: { eventDate: dateValidation.error }
        });
        return;
      }
    }

    // Validate courts data if being updated
    if (updateData.courts && updateData.courts.length > 0) {
      // ใช้ eventDate ใหม่หรือเก่า
      const eventDateToUse = updateData.eventDate || event.eventDate;
      
      // Validate date and time together
      const dateTimeValidation = validateEventDateTime(eventDateToUse, updateData.courts);
      if (!dateTimeValidation.isValid) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Invalid event date/time",
          details: { eventDateTime: dateTimeValidation.error }
        });
        return;
      }

      const courtValidation = validateCourts(updateData.courts);
      if (!courtValidation.isValid) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Invalid courts configuration",
          details: courtValidation.errors
        });
        return;
      }
    }

    // ถ้าแก้เฉพาะวันที่ (ไม่แก้ courts) ให้ตรวจสอบกับ courts เดิม
    if (updateData.eventDate && (!updateData.courts || updateData.courts.length === 0) && event.courts && event.courts.length > 0) {
      const dateTimeValidation = validateEventDateTime(updateData.eventDate, event.courts);
      if (!dateTimeValidation.isValid) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Invalid event date/time with existing courts",
          details: { eventDateTime: dateTimeValidation.error }
        });
        return;
      }
    }

    // เพิ่ม updatedBy จาก x-user-id header
    const userId = req.headers["x-user-id"] as string;
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
          message:
            "An event with the same name, date and location already exists",
          details: error.keyValue,
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      message: "Event updated successfully",
      event: {
        id: updatedEvent!.id,
        eventName: updatedEvent!.eventName,
        eventDate: updatedEvent!.eventDate,
        location: updatedEvent!.location,
        status: updatedEvent!.status,
        capacity: updatedEvent!.capacity,
        shuttlecockPrice: updatedEvent!.shuttlecockPrice,
        courtHourlyRate: updatedEvent!.courtHourlyRate,
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

export const deleteEvent = async (
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

    await Event.findByIdAndDelete(id);

    res.status(200).json({
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Delete event error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

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
      event.status === "active" && availableSlots > 0;

    res.status(200).json({
      id: event.id,
      status: event.status,
      maxParticipants: event.capacity.maxParticipants,
      currentParticipants: event.capacity.currentParticipants,
      availableSlots,
      isAcceptingRegistrations,
      waitlistEnabled: event.capacity.waitlistEnabled,
    });
  } catch (error) {
    console.error("Get event status error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
