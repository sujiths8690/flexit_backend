import { Router } from "express";
import {
    createDeviceMediaController,
    getDeviceMediaController,
    updateDeviceMediaController,
    deleteDeviceMediaController
} from "../../controllers/device/deviceContent.controller";

import { authenticate } from "../../middleware/auth";

const router = Router();

/* ================================
   CREATE DEVICE MEDIA
================================ */
router.post(
    "/",
    authenticate,
    createDeviceMediaController
);

/* ================================
   GET DEVICE MEDIA BY DEVICE
================================ */
router.get(
    "/:deviceId",
    authenticate,
    getDeviceMediaController
);

/* ================================
   UPDATE DEVICE MEDIA
================================ */
router.put(
    "/:deviceMediaId",
    authenticate,
    updateDeviceMediaController
);

/* ================================
   DELETE DEVICE MEDIA
================================ */
router.delete(
    "/:deviceMediaId",
    authenticate,
    deleteDeviceMediaController
);

export default router;