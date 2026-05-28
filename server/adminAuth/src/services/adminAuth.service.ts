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
    { expiresIn: "7d" }
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
  name: string;
  email: string;
  password: string;
  createdById: number;
}) => {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  if (!name) throw new Error("NAME_REQUIRED");
  if (!emailPattern.test(email)) throw new Error("INVALID_EMAIL");
  if (input.password.length < 8) throw new Error("WEAK_PASSWORD");

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) throw new Error("EMAIL_ALREADY_EXISTS");

  const passwordHash = await bcrypt.hash(input.password, 12);
  const admin = await prisma.adminUser.create({
    data: {
      name,
      email,
      passwordHash,
      role: AdminRole.ADMIN,
      createdById: input.createdById,
    },
  });

  return presentAdmin(admin);
};

export const getAdminById = async (id: number) => {
  const admin = await prisma.adminUser.findUnique({ where: { id } });
  if (!admin || !admin.isActive) throw new Error("ADMIN_NOT_FOUND");
  return presentAdmin(admin);
};
