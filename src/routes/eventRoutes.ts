import express from 'express';
import { 
  createEvent, 
  getEvents, 
  getEvent, 
  updateEvent, 
  deleteEvent, 
  getEventStatus 
} from '../controllers/eventController';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Events
 *     description: Event management
 */

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
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
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               code: 'VALIDATION_ERROR'
 *               message: 'maxParticipants must be >= 1'
 *               details:
 *                 field: 'capacity.maxParticipants'
 *                 min: 1
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', createEvent);

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Get all events
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, canceled, completed]
 *         description: Filter by status
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *         description: Number of events to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: number
 *           default: 0
 *         description: Number of events to skip
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
 *                     limit:
 *                       type: number
 *                     offset:
 *                       type: number
 *                     hasMore:
 *                       type: boolean
  *             example:
  *               events:
  *                 - eventId: "68c44e2d93ade3386805b831"
  *                   name: "iday Night Badminton Bash"
  *                   description: "เล่นแบดมินตันกระชับมิตร เหมาะสำหรับทุกระดับ มีจับคู่แบบสุ่มและ snack เล็กน้อยหลังเกม"
  *                   time:
  *                     date: "2025-09-19"
  *                     startTime: "18:00"
  *                     endTime: "21:00"
  *                     durationMinutes: 180
  *                   location:
  *                     name: "TCC Badminton Complex - Court A & B"
  *                     mapUrl: "https://maps.google.com/?q=TCC+Badminton+Complex"
  *                   capacity:
  *                     maxParticipants: 16
  *                     currentParticipants: 12
  *                     availableSlots: 4
  *                     waitlistEnabled: false
  *                   status:
  *                     state: "active"
  *                     isAcceptingRegistrations: true
  *                   payment:
  *                     pricePerPerson: 150
  *                     currency: "THB"
  *                     paymentRequired: true
  *                     cancellationPolicy: "ยกเลิกก่อน 24 ชั่วโมงคืนเต็มจำนวน หากยกเลิกวันงานจะถูกปรับ 100 บาท"
  *                   createdAt: "2025-09-12T16:45:33.623Z"
  *                   updatedAt: "2025-09-12T16:45:33.623Z"
  *                 - eventId: "68c44e7593ade3386805b835"
  *                   name: "Friday Night Badminton Bash"
  *                   description: "เล่นแบดมินตันกระชับมิตร เหมาะสำหรับทุกระดับ มีจับคู่แบบสุ่มและ snack เล็กน้อยหลังเกม"
  *                   time:
  *                     date: "2025-09-19"
  *                     startTime: "18:00"
  *                     endTime: "21:00"
  *                     durationMinutes: 180
  *                   location:
  *                     name: "TCC Badminton Complex - Court A & B"
  *                     mapUrl: "https://maps.google.com/?q=TCC+Badminton+Complex"
  *                   capacity:
  *                     maxParticipants: 16
  *                     currentParticipants: 12
  *                     availableSlots: 4
  *                     waitlistEnabled: false
  *                   status:
  *                     state: "active"
  *                     isAcceptingRegistrations: true
  *                   payment:
  *                     pricePerPerson: 5
  *                     currency: "THB"
  *                     paymentRequired: true
  *                     cancellationPolicy: "ยกเลิกก่อน 24 ชั่วโมงคืนเต็มจำนวน หากยกเลิกวันงานจะถูกปรับ 100 บาท"
  *                   createdAt: "2025-09-12T16:46:45.907Z"
  *                   updatedAt: "2025-09-12T16:46:45.907Z"
  *               pagination:
  *                 total: 2
  *                 limit: 10
  *                 offset: 0
  *                 hasMore: false
 *       500:
 *         description: Internal server error
 */
router.get('/', getEvents);

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get event by ID
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 event:
 *                   $ref: '#/components/schemas/Event'
  *             example:
  *               event:
  *                 eventId: "68c44e2d93ade3386805b831"
  *                 name: "Friday Night Badminton Bash"
  *                 description: "Friendly badminton session for intermediate players."
  *                 time:
  *                   date: "2025-09-12"
  *                   startTime: "18:00"
  *                   endTime: "21:00"
  *                   durationMinutes: 180
  *                 location:
  *                   name: "Bangkok Sports Complex - Hall A"
  *                   mapUrl: "https://maps.google.com/?q=Bangkok+Sports+Complex"
  *                 capacity:
  *                   maxParticipants: 12
  *                   currentParticipants: 5
  *                   availableSlots: 7
  *                   waitlistEnabled: false
  *                 status:
  *                   state: "active"
  *                   isAcceptingRegistrations: true
  *                 payment:
  *                   pricePerPerson: 100
  *                   currency: "THB"
  *                   paymentRequired: true
  *                   cancellationPolicy: "Refund 50% if canceled 24h before event"
  *                 createdAt: "2025-09-01T10:00:00Z"
  *                 updatedAt: "2025-09-10T15:30:00Z"
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               code: 'NOT_FOUND'
 *               message: 'Event not found'
 *               details:
 *                 id: '68c44e2d93ade3386805b831'
 *       500:
 *         description: Internal server error
 */
router.get('/:id', getEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   put:
 *     summary: Update event
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
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
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Event not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', updateEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     summary: Delete event
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Event not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', deleteEvent);

/**
 * @swagger
 * /api/events/{id}/status:
 *   get:
 *     summary: Get event status
 *     tags: [Events]
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
  *             example:
  *               eventId: "68c44e2d93ade3386805b831"
  *               status: "active"
  *               maxParticipants: 16
  *               currentParticipants: 12
  *               availableSlots: 4
  *               isAcceptingRegistrations: true
  *               waitlistEnabled: false
 *       404:
 *         description: Event not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id/status', getEventStatus);

export default router;
