import { Router } from "express";
import { MatchingsController } from "../controllers/matching";

const r = Router();

r.post("/matchings", MatchingsController.create);
r.post("/matchings/seed", MatchingsController.seed);
r.post("/matchings/advance", MatchingsController.finishAndRefill);
r.get("/matchings/:eventId/status", MatchingsController.status);
r.post("/matchings/advance-all", MatchingsController.advanceAll);
export default r;
