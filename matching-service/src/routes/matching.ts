import { Router } from "express";
import { MatchingsController } from "../controllers/matching";

const r = Router();

/**
 * @swagger
 * tags:
 *   - name: Matchings
 *     description: Badminton matchmaking (events/courts/queue)
 */

/**
 * @swagger
 * /api/matchings:
 *   post:
 *     summary: Create a new event
 *     tags: [Matchings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventCreate'
 *     responses:
 *       200:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventResponse'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
r.post("/matchings", MatchingsController.create);

/**
 * @swagger
 * /api/matchings/seed:
 *   post:
 *     summary: Seed initial games into available courts at a given time
 *     description: นำผู้เล่นที่พร้อม ณ เวลา `at` เข้าคิว และเติมเกมลงแต่ละคอร์ทให้ได้ 4 คนตามกติกา
 *     tags: [Matchings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SeedBody'
 *     responses:
 *       200:
 *         description: Seeded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventResponse'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
r.post("/matchings/seed", MatchingsController.seed);

/**
 * @swagger
 * /api/matchings/advance:
 *   post:
 *     summary: Finish current game on a court (if any) and start the next game
 *     description: ปิดเกมของคอร์ทที่ระบุ (ถ้ามี) แล้วยัดผู้เล่นกลุ่มถัดไปลงคอร์ทนั้นตามกติกา
 *     tags: [Matchings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdvanceBody'
 *     responses:
 *       200:
 *         description: Advanced successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventResponse'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
r.post("/matchings/advance", MatchingsController.finishAndRefill);

/**
 * @swagger
 * /api/matchings/{eventId}/status:
 *   get:
 *     summary: Get current status for an event (courts/games/queue/players)
 *     tags: [Matchings]
 *     parameters:
 *       - in: path
 *         name: eventId
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
 *               $ref: '#/components/schemas/StatusResponse'
 *       404:
 *         description: Event not found
 *       500:
 *         description: Internal server error
 */
r.get("/matchings/:eventId/status", MatchingsController.status);

/**
 * @swagger
 * /api/matchings/advance-all:
 *   post:
 *     summary: Finish and refill all courts in the event at once
 *     description: วนจบ/เติมทุกคอร์ทของอีเวนต์เดียวด้วยเวลา `at` เดียว
 *     tags: [Matchings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdvanceAllBody'
 *     responses:
 *       200:
 *         description: Advanced all successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatusResponse'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
r.post("/matchings/advance-all", MatchingsController.advanceAll);

export default r;
