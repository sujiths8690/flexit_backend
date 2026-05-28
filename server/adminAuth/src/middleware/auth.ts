import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";
import { errorResponse } from "../utils/response";

type AdminJwtPayload = {
  adminId: number;
  role: "SUPERADMIN" | "ADMIN";
};

export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) return errorResponse(res, "Unauthorized", 401);

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as AdminJwtPayload;

    const admin = await prisma.adminUser.findUnique({
      where: { id: decoded.adminId },
    });

    if (!admin || !admin.isActive) {
      return errorResponse(res, "Admin disabled", 403);
    }

    req.admin = { adminId: admin.id, role: admin.role };
    next();
  } catch {
    return errorResponse(res, "Invalid or expired token", 401);
  }
};

export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.admin) return errorResponse(res, "Unauthorized", 401);
  if (req.admin.role !== "SUPERADMIN") {
    return errorResponse(res, "Superadmin access required", 403);
  }
  next();
};
