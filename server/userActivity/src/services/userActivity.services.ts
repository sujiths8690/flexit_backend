// src/services/userActivity.service.ts
import prisma from "../config/prisma";

export const logUserActivity = async ({
  userId,
  businessId,
  action,
  description,
}: {
  userId: number;
  businessId: number;
  action: string;
  description?: string;
}) => {
  return await prisma.userActivity.create({
    data: {
      userId,
      businessId,
      action,
      description,
    },
  });
};