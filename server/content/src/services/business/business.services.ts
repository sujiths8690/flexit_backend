import prisma from "../../config/prisma";


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
    } as any,
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

