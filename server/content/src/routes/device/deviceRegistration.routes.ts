import { Router } from "express";
import {
  registerDeviceController,
  deleteDeviceController,
} from "../../controllers/device/deviceRegistrtaion.controller";
import { Role } from "../../types/role";
import { authenticate } from "../../middleware/auth";
import { allowRoles } from "../../middleware/role";

const router = Router();

/**
 * All device routes require authentication
 */
router.use(authenticate);

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
 * Delete device
 * ADMIN only
 */
router.delete(
  "/:deviceId",
  allowRoles(Role.ADMIN),
  deleteDeviceController
);

export default router;