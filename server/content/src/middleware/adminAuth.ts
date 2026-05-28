import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

type AdminJwtPayload = {
  adminId: number;
  role: "SUPERADMIN" | "ADMIN";
};

export const authenticateAdminToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) return res.status(401).json({ success: false, error: "Unauthorized" });

    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret) {
      return res.status(500).json({
        success: false,
        error: "Admin auth is not configured",
      });
    }

    const decoded = jwt.verify(token, secret) as AdminJwtPayload;
    if (!decoded.adminId || !decoded.role) {
      return res.status(401).json({ success: false, error: "Invalid admin token" });
    }

    next();
  } catch {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
};
