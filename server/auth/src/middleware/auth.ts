import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import prisma from "../config/prisma";
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
    });

    if (!user || !user.isActive) {
      res.status(403).json({ error: "User disabled" });
      return;
    }

    // Allow linking even if businessId is null
    const isLinkBusiness = req.originalUrl.includes("/link-business");

    if (!user.businessId && !isLinkBusiness) {
      res.status(403).json({
        error: "Please create a business first",
      });
      return;
    }

    req.user = {
      userId: user.id,
      role: user.role,
      businessId: user.businessId,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
