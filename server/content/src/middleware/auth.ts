import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "../types/role";

interface JwtPayload {
  userId: number;
  businessId: number;
  role: Role;
  purpose?: string;
  planId?: string;
}

const paymentJwtSecret = () =>
  process.env.PAYMENT_JWT_SECRET ||
  process.env.JWT_SECRET ||
  "local-payment-secret";

const validatePaymentToken = (req: Request, res: Response, decoded: JwtPayload) => {
  const isPaymentRoute = req.originalUrl.includes("/payments/razorpay/");
  if (decoded.purpose !== "payment" || !isPaymentRoute) {
    res.status(401).json({ error: "Invalid token scope" });
    return false;
  }
  const bodyPlanId = String(req.body?.planId ?? "").trim().toLowerCase();
  if (decoded.planId && decoded.planId !== bodyPlanId) {
    res.status(403).json({ error: "Payment token does not match this plan" });
    return false;
  }
  return true;
};

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
      if (decoded.purpose) {
        if (!validatePaymentToken(req, res, decoded)) return;
      }
    } catch (error) {
      decoded = jwt.verify(token, paymentJwtSecret()) as JwtPayload;
      if (!validatePaymentToken(req, res, decoded)) return;
    }

    // ✅ JUST TRUST JWT (NO DB CALL)
    req.user = {
      userId: decoded.userId,
      businessId: decoded.businessId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
