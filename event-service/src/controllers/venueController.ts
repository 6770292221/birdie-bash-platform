import { Request, Response } from "express";
import { Venue } from "../models/Venue";

/**
 * @swagger
 * components:
 *   schemas:
 *     Venue:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique venue identifier
 *         name:
 *           type: string
 *           description: Venue name
 *         address:
 *           type: string
 *           description: Full address
 *         phone:
 *           type: string
 *           description: Phone number
 *         rating:
 *           type: number
 *           format: float
 *           description: Rating (1-5 stars)
 *         operatingHours:
 *           type: object
 *           description: Operating hours by day
 *         facilities:
 *           type: array
 *           items:
 *             type: string
 *           description: Available facilities
 */

/**
 * @swagger
 * /api/event/venues:
 *   get:
 *     summary: Get all badminton venues
 *     description: |
 *       Retrieve a list of all available badminton venues with their details.
 *
 *       **Requirements:**
 *       - No authentication required (public endpoint)
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Search venues by name (case-insensitive partial match)
 *       - in: query
 *         name: rating
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *         description: Filter venues by minimum rating
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 50
 *           minimum: 1
 *           maximum: 100
 *         description: Number of venues to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: number
 *           default: 0
 *           minimum: 0
 *         description: Number of venues to skip for pagination
 *     responses:
 *       200:
 *         description: Venues retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 venues:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Venue'
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
 *       400:
 *         description: Bad request (invalid query parameters)
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
export const getVenues = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, rating, limit = 50, offset = 0 } = req.query;

    const limitNum = Number(limit);
    const offsetNum = Number(offset);
    const ratingNum = rating !== undefined ? Number(rating) : undefined;

    if (
      Number.isNaN(limitNum) ||
      Number.isNaN(offsetNum) ||
      (rating !== undefined && Number.isNaN(ratingNum))
    ) {
      res.status(400).json({
        error: "INVALID_QUERY",
        message: "Invalid query parameters",
      });
      return;
    }

    const safeLimit = Math.min(Math.max(limitNum, 1), 100);
    const safeOffset = Math.max(offsetNum, 0);

    const query: Record<string, unknown> = {};

    if (typeof name === "string" && name.trim().length > 0) {
      query.name = { $regex: name.trim(), $options: "i" };
    }

    if (ratingNum !== undefined) {
      query.rating = { $gte: ratingNum };
    }

    const [venues, total] = await Promise.all([
      Venue.find(query)
        .select("-_id -__v")
        .skip(safeOffset)
        .limit(safeLimit)
        .lean(),
      Venue.countDocuments(query),
    ]);

    res.status(200).json({
      venues,
      pagination: {
        total,
        limit: safeLimit,
        offset: safeOffset,
        hasMore: safeOffset + safeLimit < total,
      },
    });
  } catch (error) {
    console.error("Get venues error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * @swagger
 * /api/event/venues/{id}:
 *   get:
 *     summary: Get venue by ID
 *     description: Retrieve a specific venue by its ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Venue ID
 *     responses:
 *       200:
 *         description: Venue retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Venue'
 *       404:
 *         description: Venue not found
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
export const getVenueById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const venue = await Venue.findOne({ id })
      .select("-_id -__v")
      .lean();

    if (!venue) {
      res.status(404).json({ error: "Venue not found" });
      return;
    }

    res.status(200).json(venue);
  } catch (error) {
    console.error("Get venue by ID error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
