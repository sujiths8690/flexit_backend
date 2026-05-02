import "express";
import { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        businessId: number | null;
        role: Role;
      };
    }
  }
}

export {};