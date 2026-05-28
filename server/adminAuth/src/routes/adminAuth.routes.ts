import { Router } from "express";
import { index, login, me, store } from "../controllers/adminAuth.controller";
import { authenticateAdmin, requireSuperAdmin } from "../middleware/auth";

const router = Router();

router.post("/login", login);
router.get("/me", authenticateAdmin, me);
router.get("/admins", authenticateAdmin, requireSuperAdmin, index);
router.post("/admins", authenticateAdmin, requireSuperAdmin, store);

export default router;
