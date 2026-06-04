import { Router } from "express";
import {
  block,
  changePassword,
  destroy,
  index,
  login,
  me,
  show,
  store,
  unblock,
  update,
} from "../controllers/adminAuth.controller";
import { requestAnalytics } from "../controllers/requestAnalytics.controller";
import { authenticateAdmin, requireSuperAdmin } from "../middleware/auth";

const router = Router();

router.post("/login", login);
router.get("/me", authenticateAdmin, me);
router.get(
  "/request-analytics",
  authenticateAdmin,
  requestAnalytics
);
router.get("/admins", authenticateAdmin, requireSuperAdmin, index);
router.post("/admins", authenticateAdmin, requireSuperAdmin, store);
router.get("/admins/:id", authenticateAdmin, requireSuperAdmin, show);
router.patch("/admins/:id", authenticateAdmin, requireSuperAdmin, update);
router.patch("/admins/:id/password", authenticateAdmin, requireSuperAdmin, changePassword);
router.patch("/admins/:id/block", authenticateAdmin, requireSuperAdmin, block);
router.patch("/admins/:id/unblock", authenticateAdmin, requireSuperAdmin, unblock);
router.delete("/admins/:id", authenticateAdmin, requireSuperAdmin, destroy);

export default router;
