import { Router } from "express";
import {
  broadcastToAdmins,
  broadcastToBusiness,
  broadcastToDevice,
  getDeviceConnectionStatuses,
  isDeviceConnected
} from "../services/websocketService";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/broadcast", authenticate, (req, res) => {
  const { type, data } = req.body;
  const businessId = req.user!.businessId;

  if (!type) {
    return res.status(400).json({
      success: false,
      error: "type is required"
    });
  }

  broadcastToBusiness(businessId, {
    type,
    data
  });

  res.json({ success: true });
});

router.post("/business-broadcast", (req, res) => {
  const configuredSecret = process.env.REALTIME_INTERNAL_SECRET;
  const requestSecret = req.header("x-internal-realtime-secret");

  if (configuredSecret && requestSecret !== configuredSecret) {
    return res.status(401).json({
      success: false,
      error: "unauthorized"
    });
  }

  const { businessId, type, data } = req.body;
  const numericBusinessId = Number(businessId);

  if (!Number.isInteger(numericBusinessId) || !type) {
    return res.status(400).json({
      success: false,
      error: "businessId and type are required"
    });
  }

  console.log("Business realtime request:", numericBusinessId, type);
  broadcastToBusiness(numericBusinessId, {
    type,
    data
  });

  res.json({ success: true });
});

router.post("/admin-broadcast", (req, res) => {
  const configuredSecret = process.env.REALTIME_INTERNAL_SECRET;
  const requestSecret = req.header("x-internal-realtime-secret");

  if (configuredSecret && requestSecret !== configuredSecret) {
    return res.status(401).json({
      success: false,
      error: "unauthorized"
    });
  }

  const { type, data } = req.body;

  if (!type) {
    return res.status(400).json({
      success: false,
      error: "type is required"
    });
  }

  console.log("Admin realtime request:", type);
  broadcastToAdmins({ type, data });

  res.json({ success: true });
});

router.post("/device-broadcast", (req, res) => {
  const configuredSecret = process.env.REALTIME_INTERNAL_SECRET;
  const requestSecret = req.header("x-internal-realtime-secret");

  if (configuredSecret && requestSecret !== configuredSecret) {
    return res.status(401).json({
      success: false,
      error: "unauthorized"
    });
  }

  const { deviceCode, type, data } = req.body;

  if (!deviceCode || !type) {
    return res.status(400).json({
      success: false,
      error: "deviceCode and type are required"
    });
  }

  console.log("Device realtime request:", deviceCode, type);
  broadcastToDevice(deviceCode, { type, data });

  res.json({ success: true });
});

router.get("/device-status/:deviceCode", (req, res) => {
  const configuredSecret = process.env.REALTIME_INTERNAL_SECRET;
  const requestSecret = req.header("x-internal-realtime-secret");

  if (configuredSecret && requestSecret !== configuredSecret) {
    return res.status(401).json({
      success: false,
      error: "unauthorized"
    });
  }

  const deviceCode = req.params.deviceCode?.trim().toUpperCase();

  if (!deviceCode) {
    return res.status(400).json({
      success: false,
      error: "deviceCode is required"
    });
  }

  res.json({
    success: true,
    data: {
      deviceCode,
      online: isDeviceConnected(deviceCode)
    }
  });
});

router.post("/device-statuses", (req, res) => {
  const configuredSecret = process.env.REALTIME_INTERNAL_SECRET;
  const requestSecret = req.header("x-internal-realtime-secret");

  if (configuredSecret && requestSecret !== configuredSecret) {
    return res.status(401).json({
      success: false,
      error: "unauthorized"
    });
  }

  const { deviceCodes } = req.body;

  if (!Array.isArray(deviceCodes)) {
    return res.status(400).json({
      success: false,
      error: "deviceCodes must be an array"
    });
  }

  const normalizedDeviceCodes = deviceCodes
    .filter((deviceCode) => typeof deviceCode === "string")
    .map((deviceCode) => deviceCode.trim().toUpperCase())
    .filter(Boolean);

  res.json({
    success: true,
    data: getDeviceConnectionStatuses(normalizedDeviceCodes)
  });
});

export default router;
