import { Router } from "express";
import {
  createBusinessController,
  getBusinessByIdController,
  updateBusinessController,
  disableBusinessController,
  enableBusinessController,
  getAdminRevenueOverviewController,
  extendBusinessPlanController,
  setBusinessPlanOfferController,
  getSubscriptionPlanConfigsController,
  updateSubscriptionPlanPricesController,
  updateSubscriptionPlanDiscountController,
  deleteSubscriptionPlanDiscountController,
  createMobileNotificationController,
  createRazorpayPlanOrderController,
  deleteMobileNotificationController,
  getMobileNotificationsController,
  getMyPlanTransactionsController,
  getMyMobileNotificationsController,
  registerMobilePushTokenController,
  resendMobileNotificationController,
  verifyRazorpayPlanPaymentController
} from "../../controllers/business/business.controller";

// 🔐 (we’ll use this next step)
import { authenticate } from "../../middleware/auth";
import { authenticateAdminToken, requireSuperAdminToken } from "../../middleware/adminAuth";

const router = Router();

/* ================================
   PUBLIC ROUTES
================================ */

// Create business (initial onboarding)
router.post("/create", createBusinessController);

router.get("/plans", getSubscriptionPlanConfigsController);

router.get(
  "/admin/notifications",
  authenticateAdminToken,
  getMobileNotificationsController
);

router.post(
  "/admin/notifications",
  authenticateAdminToken,
  requireSuperAdminToken,
  createMobileNotificationController
);

router.post(
  "/admin/notifications/:id/resend",
  authenticateAdminToken,
  requireSuperAdminToken,
  resendMobileNotificationController
);

router.delete(
  "/admin/notifications/:id",
  authenticateAdminToken,
  requireSuperAdminToken,
  deleteMobileNotificationController
);

router.patch(
  "/admin/plans/prices",
  authenticateAdminToken,
  requireSuperAdminToken,
  updateSubscriptionPlanPricesController
);

router.patch(
  "/admin/plans/discount",
  authenticateAdminToken,
  requireSuperAdminToken,
  updateSubscriptionPlanDiscountController
);

router.delete(
  "/admin/plans/discount",
  authenticateAdminToken,
  requireSuperAdminToken,
  deleteSubscriptionPlanDiscountController
);

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

router.get(
  "/notifications",
  authenticate,
  getMyMobileNotificationsController
);

router.post(
  "/notifications/device-token",
  authenticate,
  registerMobilePushTokenController
);

router.get(
  "/payments/transactions",
  authenticate,
  getMyPlanTransactionsController
);

router.post(
  "/payments/razorpay/order",
  authenticate,
  createRazorpayPlanOrderController
);

router.post(
  "/payments/razorpay/verify",
  authenticate,
  verifyRazorpayPlanPaymentController
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
