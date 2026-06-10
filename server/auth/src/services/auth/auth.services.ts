import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import prisma from "../../config/prisma";
import { Role } from "@prisma/client";
import axios from "axios";

const ADMIN_REALTIME_URL =
  process.env.ADMIN_REALTIME_URL || "http://realtime:3003/realtime/admin-broadcast";
const CONTENT_SERVICE_URL =
  process.env.CONTENT_SERVICE_URL || "http://content:3002";

const notifyAdminDashboard = async (eventType: string, data: any) => {
  try {
    await axios.post(
      ADMIN_REALTIME_URL,
      {
        type: "ADMIN_DASHBOARD_UPDATED",
        data: {
          source: "auth",
          eventType,
          ...data,
        },
      },
      {
        headers: process.env.REALTIME_INTERNAL_SECRET
          ? { "x-internal-realtime-secret": process.env.REALTIME_INTERNAL_SECRET }
          : undefined,
        timeout: 1000,
      }
    );
  } catch {}
};

interface LoginResult{
    token: string;
    user:{
        id: number;
        email:string;
        username: string;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        profileImageUrl: string | null;
        role: Role;
        businessId: number | null;
    };
}

interface RegisterInput {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
}

export const registerService = async ({
  email,
  username,
  firstName,
  lastName,
  password
}: RegisterInput) => {

    try{

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        throw new Error("EMAIL_ALREADY_EXISTS");
    }

    const existingUsername = await prisma.user.findUnique({
        where: { username },
    });

    if (existingUsername) {
        throw new Error("USERNAME_ALREADY_EXISTS");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
        data: {
            email,
            username,
            firstName,
            lastName,
            passwordHash: hashedPassword,
            role: Role.ADMIN,
            businessId: null,
        },
        });

    void notifyAdminDashboard("USER_REGISTERED", {
      userId: user.id,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ").trim(),
      email: user.email,
    });

    const token = jwt.sign(
        {
        userId: user.id,
        businessId: user.businessId,
        role: user.role,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: "30m" }
    );

    return {
        token,
        user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
        businessId: user.businessId,
        },
    };
}catch(err:any){
    throw err;
}
};

export const isUsernameAvailableService = async (username: string) => {
  const user = await prisma.user.findUnique({
    where: { username },
  });

  return !user;
};

export const LoginUser = async (
  credential: string,
  password: string,
): Promise<LoginResult & { business: any }> => {

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: credential }, { username: credential }],
    },
  });

  if (!user) throw new Error("INVALID_CREDENTIALS");

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) throw new Error("INVALID_PASSWORD");

  if (!user.isActive) throw new Error("USER_DISABLED");

  // 🔥 CALL CONTENT SERVICE
  let business = null;

  if (user.businessId) {
    try {
      const response = await axios.get(
        `${CONTENT_SERVICE_URL}/api/business/${user.businessId}`
      );

      business = response.data.data;
    } catch (err:any) {
      console.log("⚠️ Failed to fetch business:", err.message);
    }
  }

  const token = jwt.sign(
    {
      userId: user.id,
      businessId: user.businessId,
      role: user.role,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "30m" }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email!,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      profileImageUrl: user.profileImageUrl,
      role: user.role,
      businessId: user.businessId,
    },
    business, // ✅ now coming from content service
  };
};

export const linkBusinessService = async (
  userId: number,
  businessId: number
) => {

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { businessId },
  });

  void notifyAdminDashboard("BUSINESS_LINKED", {
    userId: updatedUser.id,
    businessId: updatedUser.businessId,
    email: updatedUser.email,
  });

  // 🔥 CREATE NEW TOKEN
  const token = jwt.sign(
    {
      userId: updatedUser.id,
      businessId: updatedUser.businessId,
      role: updatedUser.role,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "30m" }
  );

  return {
    user: updatedUser,
    token   // ✅ RETURN NEW TOKEN
  };
};
