import { Router } from "express";
import { register, login } from "../../controllers/auth/auth.controller";

const router = Router();

/**
 * Public Routes
 */

// Register new business (creates first ADMIN)
router.post("/register", register);

// Login existing user
router.post("/login", login);

export default router;