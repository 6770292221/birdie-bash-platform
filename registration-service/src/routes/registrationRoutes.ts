import express from "express";
import {
  getPlayers,
  registerMember,
  registerGuest,
  cancelPlayerRegistration,
} from "../controllers/registrationController";

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
 *       - in: header
 *         name: x-user-id
 *         required: false
 *         schema:
 *           type: string
 *         description: User ID set by Gateway after JWT validation. Optional here; required only if calling the service directly without Gateway.
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
 *               $ref: '#/components/schemas/PlayersListResponse'
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/events/:id/players", getPlayers);

/**
 * @swagger
 * /api/registration/events/{id}/members:
 *   post:
 *     summary: Register an authenticated user for an event
 *     tags: [Registrations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-user-id
 *         required: false
 *         schema:
 *           type: string
 *         description: User ID set by Gateway after JWT validation. Optional here; required only if calling the service directly without Gateway.
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterMemberRequest'
 *           examples:
 *             withTime:
 *               summary: With time range
 *               value: { startTime: '19:00', endTime: '21:00' }
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlayerRegistrationResponse'
 *       400:
 *         description: Validation error or event full
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/events/:id/members", registerMember);
router.post("/events/:id/member", registerMember); // alias

/**
 * @swagger
 * /api/registration/events/{id}/guests:
 *   post:
 *     summary: Register a guest for an event (Admin Only)
 *     tags: [Registrations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-user-id
 *         required: false
 *         schema:
 *           type: string
 *         description: Admin user ID set by Gateway after JWT validation. Optional here; required only if calling the service directly without Gateway.
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
 *             $ref: '#/components/schemas/RegisterGuestRequest'
 *           examples:
 *             minimal:
 *               summary: Minimal payload
 *               value: { name: 'Guest A', phoneNumber: '080-000-0000' }
 *             withTime:
 *               summary: With time range
 *               value: { name: 'Guest A', phoneNumber: '080-000-0000', startTime: '19:00', endTime: '21:00' }
 *     responses:
 *       201:
 *         description: Guest registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlayerRegistrationResponse'
 *       400:
 *         description: Validation error or event full
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Admin privileges required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/events/:id/guests", registerGuest);

/**
 * @swagger
 * /api/registration/events/{id}/players/{pid}/cancel:
 *   post:
 *     summary: Cancel a player's registration
 *     tags: [Registrations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-user-id
 *         required: false
 *         schema:
 *           type: string
 *         description: User ID set by Gateway after JWT validation. Optional here; required only if calling the service directly without Gateway.
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
 *       400:
 *         description: Already canceled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Event or player not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/events/:id/players/:pid/cancel", cancelPlayerRegistration);

export default router;
