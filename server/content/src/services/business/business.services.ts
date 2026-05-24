import prisma from "../../config/prisma";
import { broadcastBusinessDisplayConfigs } from "../../utils/deviceDisplayRealtime";


export const createBusinessService = async ({
  name,
  address,
  email,
  mobile,
  logoUrl,
  showPrice,
  showDescription,
  showLogo,
  showCompanyName,
  showProductImage,
  showComboItemQuantity,
}: {
  name: string;
  address?: string;
  email?: string;
  mobile?: string;
  logoUrl?: string;
  showPrice?: boolean;
  showDescription?: boolean;
  showLogo?: boolean;
  showCompanyName?: boolean;
  showProductImage?: boolean;
  showComboItemQuantity?: boolean;
}) => {

  const business = await prisma.business.create({
    data: {
      name,
      address,
      email,
      mobile,
      logoUrl,
      ...(showPrice !== undefined && { showPrice }),
      ...(showDescription !== undefined && { showDescription }),
      ...(showLogo !== undefined && { showLogo }),
      ...(showCompanyName !== undefined && { showCompanyName }),
      ...(showProductImage !== undefined && { showProductImage }),
      ...(showComboItemQuantity !== undefined && { showComboItemQuantity }),
      isActive: true,
    } as any,
  });

  return business;
};

export const updateBusinessService = async ({
  id,
  name,
  address,
  email,
  mobile,
  logoUrl,
  showPrice,
  showDescription,
  showLogo,
  showCompanyName,
  showProductImage,
  showComboItemQuantity,
}: {
  id: number;
  name?: string;
  address?: string;
  email?: string;
  mobile?: string;
  logoUrl?: string;
  showPrice?: boolean;
  showDescription?: boolean;
  showLogo?: boolean;
  showCompanyName?: boolean;
  showProductImage?: boolean;
  showComboItemQuantity?: boolean;
}) => {

  const business = await prisma.business.findUnique({
    where: { id },
  });

  if (!business) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  const updated = await prisma.business.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(address !== undefined && { address }),
      ...(email !== undefined && { email }),
      ...(mobile !== undefined && { mobile }),
      ...(logoUrl !== undefined && { logoUrl }),
      ...(showPrice !== undefined && { showPrice }),
      ...(showDescription !== undefined && { showDescription }),
      ...(showLogo !== undefined && { showLogo }),
      ...(showCompanyName !== undefined && { showCompanyName }),
      ...(showProductImage !== undefined && { showProductImage }),
      ...(showComboItemQuantity !== undefined && { showComboItemQuantity }),
    } as any,
  });

  if (showComboItemQuantity !== undefined) {
    await prisma.device.updateMany({
      where: { businessId: id, isActive: true },
      data: { showComboItemQuantity },
    });
  }

  void broadcastBusinessDisplayConfigs(id);

  return updated;
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

