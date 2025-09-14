import express from 'express';
import { getPlayers, registerMember, registerGuest, cancelPlayerRegistration } from '../controllers/registrationController';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Registrations
 *     description: Registration management
 */

// Base here is mounted at /api/registration in server.ts

/**
 * @swagger
 * /api/registration/events/{id}/players:
 *   get:
 *     summary: Get list of players for an event
 *     tags: [Registrations]
 *     security:
 *       - BearerAuth: []
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
 */
router.get('/events/:id/players', getPlayers);

/**
 * @swagger
 * /api/registration/events/{id}/members:
 *   post:
 *     summary: Register an authenticated user for an event
 *     tags: [Registrations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 */
router.post('/events/:id/members', registerMember);
router.post('/events/:id/member', registerMember); // alias

/**
 * @swagger
 * /api/registration/events/{id}/guests:
 *   post:
 *     summary: Register a guest for an event (Admin Only)
 *     tags: [Registrations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phoneNumber]
 *             properties:
 *               name:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *     responses:
 *       201:
 *         description: Guest registered successfully
 */
router.post('/events/:id/guests', registerGuest);

/**
 * @swagger
 * /api/registration/events/{id}/players/{pid}/cancel:
 *   post:
 *     summary: Cancel a player's registration
 *     tags: [Registrations]
 *     security:
 *       - BearerAuth: []
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
 */
router.post('/events/:id/players/:pid/cancel', cancelPlayerRegistration);

export default router;
