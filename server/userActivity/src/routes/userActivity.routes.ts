// src/routes/userActivity.routes.ts
import { Router } from "express";
import { createActivity } from "../controllers/userActivity.controller";

const router = Router();

router.post("/", createActivity);

export default router;