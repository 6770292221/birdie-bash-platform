import express from "express";
import { getVenues, getVenueById } from "../controllers/venueController";

const router = express.Router();

// Get all venues
router.get("/", getVenues);

// Get venue by ID
router.get("/:id", getVenueById);

export default router;