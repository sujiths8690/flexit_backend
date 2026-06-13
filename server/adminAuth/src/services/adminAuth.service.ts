import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AdminRole } from "@prisma/client";
import prisma from "../config/prisma";
import { presentAdmin } from "../utils/adminPresenter";

const emailPattern = /^[\w\-.]+@([\w-]+\.)+[\w-]{2,}$/;

export const loginAdmin = async (email: string, password: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const admin = await prisma.adminUser.findUnique({
    where: { email: normalizedEmail },
  });

  if (!admin || !admin.isActive) throw new Error("INVALID_CREDENTIALS");

  const passwordOk = await bcrypt.compare(password, admin.passwordHash);
  if (!passwordOk) throw new Error("INVALID_CREDENTIALS");

  const updatedAdmin = await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  const token = jwt.sign(
    { adminId: admin.id, role: admin.role },
    process.env.JWT_SECRET as string,
    { expiresIn: "8h" }
  );

  return { token, admin: presentAdmin(updatedAdmin) };
};

export const listAdmins = async () => {
  const admins = await prisma.adminUser.findMany({
    orderBy: [{ role: "desc" }, { createdAt: "asc" }],
  });
  return admins.map(presentAdmin);
};

export const createAdmin = async (input: {
  name?: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  age?: number;
  address?: string;
  email: string;
  password: string;
  createdById: number;
}) => {
  const firstName = input.firstName?.trim() || "";
  const lastName = input.lastName?.trim() || "";
  const name = (input.name?.trim() || [firstName, lastName].filter(Boolean).join(" ")).trim();
  const email = input.email.trim().toLowerCase();
  const mobile = input.mobile?.trim();
  const address = input.address?.trim();
  const age =
    input.age !== undefined && Number.isFinite(Number(input.age))
      ? Number(input.age)
      : undefined;

  if (!name) throw new Error("NAME_REQUIRED");
  if (!emailPattern.test(email)) throw new Error("INVALID_EMAIL");
  if (input.password.length < 8) throw new Error("WEAK_PASSWORD");
  if (age !== undefined && (age < 0 || age > 130)) throw new Error("INVALID_AGE");

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) throw new Error("EMAIL_ALREADY_EXISTS");

  const passwordHash = await bcrypt.hash(input.password, 12);
  const admin = await prisma.adminUser.create({
    data: {
      name,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      mobile: mobile || undefined,
      age,
      address: address || undefined,
      email,
      passwordHash,
      role: AdminRole.ADMIN,
      createdById: input.createdById,
    },
  });

  return presentAdmin(admin);
};

export const updateAdmin = async (
  id: number,
  actorId: number,
  input: {
    name?: string;
    firstName?: string;
    lastName?: string;
    mobile?: string;
    age?: number;
    address?: string;
    email?: string;
  }
) => {
  if (id === actorId) throw new Error("CANNOT_MODIFY_SELF");

  const admin = await prisma.adminUser.findUnique({ where: { id } });
  if (!admin) throw new Error("ADMIN_NOT_FOUND");
  if (admin.role === AdminRole.SUPERADMIN) throw new Error("CANNOT_MODIFY_SUPERADMIN");

  const firstName = input.firstName?.trim();
  const lastName = input.lastName?.trim();
  const explicitName = input.name?.trim();
  const existingFirstName = (admin as any).firstName as string | null;
  const existingLastName = (admin as any).lastName as string | null;
  const name = (
    explicitName ||
    [firstName ?? existingFirstName, lastName ?? existingLastName]
      .filter(Boolean)
      .join(" ")
  ).trim();
  const email = input.email?.trim().toLowerCase();
  const mobile = input.mobile?.trim();
  const address = input.address?.trim();
  const age =
    input.age !== undefined && Number.isFinite(Number(input.age))
      ? Number(input.age)
      : undefined;

  if (!name) throw new Error("NAME_REQUIRED");
  if (email !== undefined && !emailPattern.test(email)) throw new Error("INVALID_EMAIL");
  if (age !== undefined && (age < 0 || age > 130)) throw new Error("INVALID_AGE");

  if (email && email !== admin.email) {
    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const updated = await prisma.adminUser.update({
    where: { id },
    data: {
      name,
      ...(firstName !== undefined && { firstName: firstName || null }),
      ...(lastName !== undefined && { lastName: lastName || null }),
      ...(mobile !== undefined && { mobile: mobile || null }),
      ...(age !== undefined && { age }),
      ...(input.age === undefined ? {} : age === undefined ? { age: null } : {}),
      ...(address !== undefined && { address: address || null }),
      ...(email !== undefined && { email }),
    },
  });

  return presentAdmin(updated);
};

export const changeAdminPassword = async (
  id: number,
  actorId: number,
  password: string
) => {
  if (id === actorId) throw new Error("CANNOT_MODIFY_SELF");

  const admin = await prisma.adminUser.findUnique({ where: { id } });
  if (!admin) throw new Error("ADMIN_NOT_FOUND");
  if (admin.role === AdminRole.SUPERADMIN) throw new Error("CANNOT_MODIFY_SUPERADMIN");
  if (password.length < 8) throw new Error("WEAK_PASSWORD");

  const passwordHash = await bcrypt.hash(password, 12);
  const updated = await prisma.adminUser.update({
    where: { id },
    data: { passwordHash },
  });

  return presentAdmin(updated);
};

export const getAdminById = async (id: number, includeInactive = false) => {
  const admin = await prisma.adminUser.findUnique({ where: { id } });
  if (!admin || (!includeInactive && !admin.isActive)) {
    throw new Error("ADMIN_NOT_FOUND");
  }
  return presentAdmin(admin);
};

export const blockAdmin = async (id: number, actorId: number) => {
  if (id === actorId) throw new Error("CANNOT_MODIFY_SELF");

  const admin = await prisma.adminUser.findUnique({ where: { id } });
  if (!admin) throw new Error("ADMIN_NOT_FOUND");
  if (admin.role === AdminRole.SUPERADMIN) throw new Error("CANNOT_MODIFY_SUPERADMIN");

  const updated = await prisma.adminUser.update({
    where: { id },
    data: { isActive: false },
  });
  return presentAdmin(updated);
};

export const unblockAdmin = async (id: number, actorId: number) => {
  if (id === actorId) throw new Error("CANNOT_MODIFY_SELF");

  const admin = await prisma.adminUser.findUnique({ where: { id } });
  if (!admin) throw new Error("ADMIN_NOT_FOUND");
  if (admin.role === AdminRole.SUPERADMIN) throw new Error("CANNOT_MODIFY_SUPERADMIN");

  const updated = await prisma.adminUser.update({
    where: { id },
    data: { isActive: true },
  });
  return presentAdmin(updated);
};

export const deleteAdmin = async (id: number, actorId: number) => {
  if (id === actorId) throw new Error("CANNOT_MODIFY_SELF");

  const admin = await prisma.adminUser.findUnique({ where: { id } });
  if (!admin) throw new Error("ADMIN_NOT_FOUND");
  if (admin.role === AdminRole.SUPERADMIN) throw new Error("CANNOT_MODIFY_SUPERADMIN");

  await prisma.adminUser.delete({ where: { id } });
};
