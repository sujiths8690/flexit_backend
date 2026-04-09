import "express";
import { Role } from "./role";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        businessId: number;
        role: Role;
      };
    }
  }
}

export {};