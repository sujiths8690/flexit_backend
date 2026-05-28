import { AdminUser } from "@prisma/client";

export const presentAdmin = (admin: AdminUser) => ({
  id: admin.id,
  name: admin.name,
  email: admin.email,
  role: admin.role,
  isActive: admin.isActive,
  createdById: admin.createdById,
  lastLoginAt: admin.lastLoginAt,
  createdAt: admin.createdAt,
});
