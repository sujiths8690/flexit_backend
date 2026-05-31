// src/routes/userActivity.routes.ts
import { Router } from "express";
import {
  createActivity,
  createAppError,
  deleteAppError,
  getActivities,
  getAppErrors,
} from "../controllers/userActivity.controller";

const router = Router();

router.post("/", createActivity);
router.get("/", getActivities);
router.post("/errors", createAppError);
router.get("/errors", getAppErrors);
router.delete("/errors/:errorId", deleteAppError);

export default router;
