// src/routes/userActivity.routes.ts
import { Router } from "express";
import {
  createActivity,
  createAppError,
  deleteAppError,
  getActivities,
  getAppErrors,
} from "../controllers/userActivity.controller";
import { authenticateAdmin } from "../middleware/adminAuth";
import { createRateLimiter } from "../utils/rateLimit";

const router = Router();

const reportLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 60,
  keyPrefix: "activity-report",
});

router.post("/", reportLimiter, createActivity);
router.get("/", authenticateAdmin, getActivities);
router.post("/errors", reportLimiter, createAppError);
router.get("/errors", authenticateAdmin, getAppErrors);
router.delete("/errors/:errorId", authenticateAdmin, deleteAppError);

export default router;
