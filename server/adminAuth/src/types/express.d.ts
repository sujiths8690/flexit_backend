import { AdminRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      admin?: {
        adminId: number;
        role: AdminRole;
      };
    }
  }
}

export {};
