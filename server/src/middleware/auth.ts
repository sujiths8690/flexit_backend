import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";
import { Role } from "@prisma/client";

/**
 * What we expect inside JWT
 */
interface JwtPayload {
  userId: number;
  businessId: number;
  role: Role;
}

/**
 * Extend Express Request type
 */

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { business: true },
    });

    if (!user || !user.isActive) {
      res.status(403).json({ error: "User disabled" });
      return;
    }

    if (!user.business.isActive) {
      res.status(403).json({ error: "Business inactive" });
      return;
    }

    req.user = {
      userId: user.id,
      role: user.role,
      businessId: user.businessId,
    };

    req.businessId = user.businessId;

    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
