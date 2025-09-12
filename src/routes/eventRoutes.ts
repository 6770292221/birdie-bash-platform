import express from 'express';
import { 
  createEvent, 
  getEvents, 
  getEvent, 
  updateEvent, 
  deleteEvent, 
  getEventStatus 
} from '../controllers/eventController';
import { 
  createCourt, 
  getCourts, 
  getCourt, 
  updateCourt, 
  deleteCourt 
} from '../controllers/courtController';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Events
 *     description: Event management
 *   - name: Courts
 *     description: Court management for events
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
 *       404:
 *         description: Event not found
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
 *       404:
 *         description: Event not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id/status', getEventStatus);

// Court routes
/**
 * @swagger
 * /api/events/{eventId}/courts:
 *   post:
 *     summary: Create a court for an event
 *     tags: [Courts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CourtCreate'
 *     responses:
 *       201:
 *         description: Court created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 court:
 *                   $ref: '#/components/schemas/Court'
 *       400:
 *         description: Bad request
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Event not found
 *       500:
 *         description: Internal server error
 */
router.post('/:eventId/courts', createCourt);

/**
 * @swagger
 * /api/events/{eventId}/courts:
 *   get:
 *     summary: Get courts for an event
 *     tags: [Courts]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Courts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 courts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Court'
 *       404:
 *         description: Event not found
 *       500:
 *         description: Internal server error
 */
router.get('/:eventId/courts', getCourts);

/**
 * @swagger
 * /api/events/{eventId}/courts/{courtId}:
 *   get:
 *     summary: Get specific court
 *     tags: [Courts]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *       - in: path
 *         name: courtId
 *         required: true
 *         schema:
 *           type: string
 *         description: Court ID
 *     responses:
 *       200:
 *         description: Court retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 court:
 *                   $ref: '#/components/schemas/Court'
 *       404:
 *         description: Court not found
 *       500:
 *         description: Internal server error
 */
router.get('/:eventId/courts/:courtId', getCourt);

/**
 * @swagger
 * /api/events/{eventId}/courts/{courtId}:
 *   put:
 *     summary: Update court
 *     tags: [Courts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *       - in: path
 *         name: courtId
 *         required: true
 *         schema:
 *           type: string
 *         description: Court ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CourtCreate'
 *     responses:
 *       200:
 *         description: Court updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 court:
 *                   $ref: '#/components/schemas/Court'
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Court not found
 *       500:
 *         description: Internal server error
 */
router.put('/:eventId/courts/:courtId', updateCourt);

/**
 * @swagger
 * /api/events/{eventId}/courts/{courtId}:
 *   delete:
 *     summary: Delete court
 *     tags: [Courts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *       - in: path
 *         name: courtId
 *         required: true
 *         schema:
 *           type: string
 *         description: Court ID
 *     responses:
 *       200:
 *         description: Court deleted successfully
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
 *         description: Court not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:eventId/courts/:courtId', deleteCourt);

export default router;