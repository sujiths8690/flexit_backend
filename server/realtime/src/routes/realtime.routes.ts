import { Router } from "express";
import {
  broadcastToBusiness,
  broadcastToDevice
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

export default router;
