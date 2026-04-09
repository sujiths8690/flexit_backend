import { Router } from "express";
import { broadcastToBusiness } from "../services/websocketService";
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

export default router;