import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import prisma from "../../config/prisma";
import { Role } from "@prisma/client";
import axios from "axios";

interface LoginResult{
    token: string;
    user:{
        id: number;
        email:string;
        role: Role;
    };
}

interface RegisterInput {
  email: string;
  password: string;
}

export const registerService = async ({
  email,
  password
}: RegisterInput) => {

    try{

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        throw new Error("EMAIL_ALREADY_EXISTS");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
        data: {
            email,
            username: email,
            passwordHash: hashedPassword,
            role: Role.ADMIN,
            businessId: null,
        },
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
        role: user.role,
        },
    };
}catch(err:any){
    throw err;
}
};


export const LoginUser = async (
  email: string,
  password: string,
): Promise<LoginResult & { business: any }> => {

  const user = await prisma.user.findUnique({
    where: { email },
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
        `http://texboard-content-1:3002/api/business/${user.businessId}`
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
      role: user.role,
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