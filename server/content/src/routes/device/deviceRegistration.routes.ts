import { Router } from "express";
import {
  registerDeviceController,
  pairDeviceController,
  listDevicesController,
  updateDeviceMetadataController,
  getAdminBusinessDeviceOverviewController,
  getDeviceConfigController,
  updateDeviceConfigController,
  deleteDeviceController,
} from "../../controllers/device/deviceRegistrtaion.controller";
import { Role } from "../../types/role";
import { authenticate } from "../../middleware/auth";
import { authenticateAdminToken } from "../../middleware/adminAuth";
import { allowRoles } from "../../middleware/role";

const router = Router();

/**
 * Display polling route is public because the device has no user token before pairing.
 */
router.get(
  "/:deviceCode/config",
  getDeviceConfigController
);

router.post(
  "/:deviceCode/metadata",
  updateDeviceMetadataController
);

router.get(
  "/admin/business/:businessId/overview",
  authenticateAdminToken,
  getAdminBusinessDeviceOverviewController
);

/**
 * All device routes require authentication
 */
router.use(authenticate);

/**
 * List devices for authenticated user's business.
 */
router.get(
  "/",
  allowRoles(Role.ADMIN, Role.STAFF),
  listDevicesController
);

/**
 * Register device
 * ADMIN + STAFF allowed
 */
router.post(
  "/",
  allowRoles(Role.ADMIN, Role.STAFF),
  registerDeviceController
);

/**
 * Pair a display-generated device code to the authenticated user's business.
 */
router.post(
  "/pair",
  allowRoles(Role.ADMIN, Role.STAFF),
  pairDeviceController
);

/**
 * Update display settings such as theme and orientation.
 */
router.patch(
  "/:deviceId/config",
  allowRoles(Role.ADMIN, Role.STAFF),
  updateDeviceConfigController
);

/**
 * Delete device
 * ADMIN only
 */
router.delete(
  "/:deviceId",
  allowRoles(Role.ADMIN),
  deleteDeviceController
);

export default router;
