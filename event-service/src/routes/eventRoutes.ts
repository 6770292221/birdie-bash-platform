import express from 'express';
import {
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  getEventStatus
} from '../controllers/eventController';
import { registerPlayer, registerGuest, getPlayers, cancelPlayerRegistration } from '../controllers/playerController';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Events
 *     description: Event management
 *   - name: Players
 *     description: Player registration management
 */

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventCreate'
 *     responses:
 *       201:
 *         description: Event created successfully
 *       400:
 *         description: Bad request
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
 *     responses:
 *       200:
 *         description: Events retrieved successfully
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
 *     responses:
 *       200:
 *         description: Event retrieved successfully
 *       404:
 *         description: Event not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', getEvent);
router.patch('/:id', updateEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     summary: Delete event
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event deleted successfully
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
 *     responses:
 *       200:
 *         description: Event status retrieved successfully
 *       404:
 *         description: Event not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id/status', getEventStatus);

/**
 * @swagger
 * /api/events/{id}/members:
 *   post:
 *     summary: Register an authenticated user for an event
 *     tags: [Players]
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Register an authenticated user for an event.
 *
 *       **Requirements:**
 *       - Valid JWT token via Authorization header
 *       - Gateway injects x-user-id, x-user-name, x-user-email headers
 *       - Request body contains only time preferences
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
 *             $ref: '#/components/schemas/RegisterByUser'
 *           example:
 *             startTime: "20:00"
 *             endTime: "22:00"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 eventId:
 *                   type: string
 *                 playerId:
 *                   type: string
 *                 userId:
 *                   type: string
 *                   description: User ID
 *                 registrationTime:
 *                   type: string
 *                   format: date-time
 *                 status:
 *                   type: string
 *                   enum: [registered, waitlist, cancelled]
 *       400:
 *         description: Bad request (validation error, event not accepting registrations, event full, user already registered)
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
router.post('/:id/members', registerPlayer);

/**
 * @swagger
 * /api/events/{id}/guests:
 *   post:
 *     summary: Register a guest for an event (Admin Only)
 *     tags: [Players]
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Register a guest for an event. This endpoint requires admin privileges.
 *
 *       **Requirements:**
 *       - Valid JWT token with admin role
 *       - Gateway injects x-user-id and x-user-role headers
 *       - Request body must contain guest name and phone number
 *       - Phone number is used to prevent duplicate registrations
 *       - Admin user ID is recorded as createdBy field
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
 *             $ref: '#/components/schemas/RegisterByGuest'
 *           example:
 *             name: "John Guest"
 *             phoneNumber: "+66812345678"
 *             startTime: "18:00"
 *             endTime: "20:00"
 *     responses:
 *       201:
 *         description: Guest registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 eventId:
 *                   type: string
 *                 playerId:
 *                   type: string
 *                 userId:
 *                   type: string
 *                   nullable: true
 *                   description: Always null for guest registrations
 *                 createdBy:
 *                   type: string
 *                   description: Admin user ID who created this guest registration
 *                 registrationTime:
 *                   type: string
 *                   format: date-time
 *                 status:
 *                   type: string
 *                   enum: [registered, waitlist, cancelled]
 *       400:
 *         description: Bad request (validation error, event not accepting registrations, event full, guest already registered)
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
router.post('/:id/guests', registerGuest);
router.get('/:id/players', getPlayers);
router.post('/:id/players/:pid/cancel', cancelPlayerRegistration);

export default router;