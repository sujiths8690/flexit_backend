import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";

/**
 * Allowed plans in the system
 */
export type PlanType = "basic" | "standard" | "premium";

/**
 * Plan-based authorization middleware
 */
export const requirePlan =
  (requiredPlan: PlanType) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.businessId) {
        res.status(401).json({ error: "Business not found" });
        return;
      }

      const setting = await prisma.setting.findUnique({
        where: {
          businessId_keyName: {
            businessId: req.businessId,
            keyName: "plan",
          },
        },
      });

      if (!setting || setting.value !== requiredPlan) {
        res.status(403).json({ error: "Upgrade required" });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ error: "Plan validation failed" });
    }
  };
