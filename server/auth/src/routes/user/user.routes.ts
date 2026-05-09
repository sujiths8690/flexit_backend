import { Router } from "express";
import {
  createUser,
  getUser,
  updateUser,
  getOwnProfile,
  updateOwnProfile,
  disableUser,
  enableUser,
  changePassword,
  verifyCurrentPassword,
  passwordReset,
  resetPasswordWithToken,
} from "../../controllers/user/user.controller";

import { authenticate } from "../../middleware/auth";
import { allowRoles } from "../../middleware/role";
import { Role } from "@prisma/client";

const router = Router();

router.get(
  "/me",
  authenticate,
  getOwnProfile
);

router.patch(
  "/me",
  authenticate,
  updateOwnProfile
);

/**
 * ----------------------------------------
 * Admin-only Routes
 * ----------------------------------------
 */

// Create user (Admin only)
router.post(
  "/",
  authenticate,
  allowRoles(Role.ADMIN),
  createUser
);

// Update user (Admin only)
router.patch(
  "/:id",
  authenticate,
  allowRoles(Role.ADMIN),
  updateUser
);

// Disable user (Admin only)
router.patch(
  "/:id/disable",
  authenticate,
  allowRoles(Role.ADMIN),
  disableUser
);

// Enable user (Admin only)
router.patch(
  "/:id/enable",
  authenticate,
  allowRoles(Role.ADMIN),
  enableUser
);

// Get single user (Admin only)
router.get(
  "/:id",
  authenticate,
  allowRoles(Role.ADMIN),
  getUser
);

/**
 * ----------------------------------------
 * Authenticated User Routes
 * ----------------------------------------
 */

// Change own password
router.post(
  "/change-password",
  authenticate,
  changePassword
);

router.post(
  "/verify-password",
  authenticate,
  verifyCurrentPassword
);

/**
 * ----------------------------------------
 * Public Routes
 * ----------------------------------------
 */

// Forgot password (public)
router.post(
  "/forgot-password",
  passwordReset
);

router.post(
  "/reset-password",
  resetPasswordWithToken
);

export default router;
