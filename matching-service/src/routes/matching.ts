import { Router } from "express";
import { MatchingsController } from "../controllers/matching";

const router = Router();

router.post("/matchings/seed", MatchingsController.seed);
router.post("/matchings/advance", MatchingsController.finishAndRefill);
router.get("/matchings/:eventId/status", MatchingsController.status);
router.post("/matchings/close", MatchingsController.close);
export default router;
