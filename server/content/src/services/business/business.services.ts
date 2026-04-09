import prisma from "../../config/prisma";


export const createBusinessService = async ({
  name,
  address,
  email,
  mobile,
}: {
  name: string;
  address?: string;
  email?: string;
  mobile?: string;
}) => {

  const business = await prisma.business.create({
    data: {
      name,
      address,
      email,
      mobile,
      isActive: true,
    },
  });

  return business;
};

export const updateBusinessService = async ({
  id,
  name,
  address,
  email,
  mobile,
}: {
  id: number;
  name?: string;
  address?: string;
  email?: string;
  mobile?: string;
}) => {

  const business = await prisma.business.findUnique({
    where: { id },
  });

  if (!business) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  return prisma.business.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(address && { address }),
      ...(email && { email }),
      ...(mobile && { mobile }),
    },
  });
};

export const getBusinessByIdService = async (id: number) => {

  const business = await prisma.business.findUnique({
    where: { id },
  });

  if (!business) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  return business;
};

export const disableBusinessService = async (id: number) => {

  const business = await prisma.business.findUnique({
    where: { id },
  });

  if (!business) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  return prisma.business.update({
    where: { id },
    data: {
      isActive: false,
    },
  });
};

export const enableBusinessService = async (id: number) => {

  return prisma.business.update({
    where: { id },
    data: {
      isActive: true,
    },
  });
};

