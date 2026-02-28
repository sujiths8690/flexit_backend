import { Role } from "@prisma/client";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      userId: number;
      role: Role;
      businessId: number;
    };
    businessId?: number;
  }
}

export {};
