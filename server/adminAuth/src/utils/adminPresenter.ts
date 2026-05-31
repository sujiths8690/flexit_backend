import { AdminUser } from "@prisma/client";

export const presentAdmin = (admin: AdminUser) => ({
  id: admin.id,
  name: admin.name,
  firstName: (admin as any).firstName,
  lastName: (admin as any).lastName,
  mobile: (admin as any).mobile,
  age: (admin as any).age,
  address: (admin as any).address,
  email: admin.email,
  role: admin.role,
  isActive: admin.isActive,
  createdById: admin.createdById,
  lastLoginAt: admin.lastLoginAt,
  createdAt: admin.createdAt,
});
