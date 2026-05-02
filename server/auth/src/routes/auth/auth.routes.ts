import { Router } from "express";
import { register, login, linkBusiness } from "../../controllers/auth/auth.controller";
import { authenticate } from "../../middleware/auth";

const router = Router();

/**
 * Public Routes
 */

// Register new business (creates first ADMIN)
router.post("/register", register);

// Login existing user
router.post("/login", login);

router.post("/link-business", authenticate, linkBusiness);

export default router;