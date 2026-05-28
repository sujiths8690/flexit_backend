import bcrypt from "bcrypt";
import { AdminRole } from "@prisma/client";
import prisma from "../config/prisma";

export const seedSuperAdmin = async () => {
  const email = process.env.SUPERADMIN_EMAIL || "superadmin@flexitinvaikom";
  const password = process.env.SUPERADMIN_PASSWORD || "FlexitAdmin8634@";
  const name = process.env.SUPERADMIN_NAME || "Flexit Superadmin";

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  const passwordHash = await bcrypt.hash(password, 12);

  if (existing) {
    if (
      existing.role !== AdminRole.SUPERADMIN ||
      !existing.isActive ||
      existing.name !== name
    ) {
      await prisma.adminUser.update({
        where: { id: existing.id },
        data: { name, role: AdminRole.SUPERADMIN, isActive: true, passwordHash },
      });
    }
    return;
  }

  await prisma.adminUser.create({
    data: {
      name,
      email,
      passwordHash,
      role: AdminRole.SUPERADMIN,
    },
  });
};
