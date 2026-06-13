import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

type AdminJwtPayload = {
  adminId: number;
  role: "SUPERADMIN" | "ADMIN";
};

export const authenticateAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authorization = req.headers.authorization;
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : undefined;
    if (!token) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const decoded = jwt.verify(
      token,
      (process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET) as string
    ) as AdminJwtPayload;
    if (!decoded.adminId || !["SUPERADMIN", "ADMIN"].includes(decoded.role)) {
      res.status(403).json({ success: false, error: "Admin access required" });
      return;
    }
    next();
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
};
