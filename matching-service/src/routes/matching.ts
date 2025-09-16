import { Router } from "express";
import { MatchingsController } from "../controllers/matching";

const r = Router();

r.post("/matchings", MatchingsController.create); // { id?, courts?, useMock?, players? }
r.post("/matchings/seed", MatchingsController.seed); // { eventId, at? }
r.post("/matchings/advance", MatchingsController.finishAndRefill); // { eventId, courtId, at? }
r.get("/matchings/:eventId/status", MatchingsController.status);
r.post("/matchings/advance-all", MatchingsController.advanceAll); // { eventId, at? }

export default r;
