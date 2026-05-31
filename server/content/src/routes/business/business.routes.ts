import { Router } from "express";
import {
  createBusinessController,
  getBusinessByIdController,
  updateBusinessController,
  disableBusinessController,
  enableBusinessController,
  getAdminRevenueOverviewController,
  extendBusinessPlanController,
  setBusinessPlanOfferController
} from "../../controllers/business/business.controller";

// 🔐 (we’ll use this next step)
import { authenticate } from "../../middleware/auth";
import { authenticateAdminToken } from "../../middleware/adminAuth";

const router = Router();

/* ================================
   PUBLIC ROUTES
================================ */

// Create business (initial onboarding)
router.post("/create", createBusinessController);

router.get(
  "/admin/revenue/overview",
  authenticateAdminToken,
  getAdminRevenueOverviewController
);

router.patch(
  "/admin/business/:id/extend-plan",
  authenticateAdminToken,
  extendBusinessPlanController
);

router.patch(
  "/admin/business/:id/plan-offer",
  authenticateAdminToken,
  setBusinessPlanOfferController
);

// Get business (can be public for now)
router.get("/:id", getBusinessByIdController);


/* ================================
   PROTECTED ROUTES
================================ */

// 🔥 apply auth middleware to everything below
router.use(authenticate);

// Update business
router.put("/update/:id", updateBusinessController);

// Disable business
router.patch("/disable/:id", disableBusinessController);

// Enable business
router.patch("/enable/:id", enableBusinessController);

export default router;
