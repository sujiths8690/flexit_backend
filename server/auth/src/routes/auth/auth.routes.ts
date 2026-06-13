import { Router } from "express";
import { register, login, linkBusiness, usernameAvailable } from "../../controllers/auth/auth.controller";
import { authenticate } from "../../middleware/auth";
import { createRateLimiter } from "../../utils/security";

const router = Router();

/**
 * Public Routes
 */

// Register new business (creates first ADMIN)
router.post(
  "/register",
  createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyPrefix: "register",
  }),
  register
);

// Login existing user
router.post(
  "/login",
  createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    keyPrefix: "login",
  }),
  login
);

router.get("/username-available", usernameAvailable);

router.post("/link-business", authenticate, linkBusiness);

export default router;
