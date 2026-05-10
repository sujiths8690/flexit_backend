import prisma from "../../config/prisma";
import { sendRealtimeUpdate } from "../../utils/realtimeClient";
import { broadcastBusinessDisplayConfigs } from "../../utils/deviceDisplayRealtime";

type ComboItemInput = {
  productId: number;
  quantity?: number;
  variantLabel?: string | null;
  variantPrice?: number | null;
};

type ComboInput = {
  comboId?: number;
  businessId: number;
  name: string;
  description?: string | null;
  price?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  items: ComboItemInput[];
  token?: string;
};

const money = (value: any) =>
  value === null || value === undefined ? null : Number(value);

const productDto = (product: any) => ({
  id: product.id,
  name: product.name,
  description: product.description,
  price: money(product.price) ?? 0,
  priceVariants: product.priceVariants ?? [],
  vegFlag: product.vegFlag,
  imageUrl: product.imageUrl,
  categoryId: product.categoryId,
  categoryName: product.category?.name ?? null,
  isAvailable: product.isAvailable,
});

const comboDto = (combo: any) => ({
  id: combo.id,
  name: combo.name,
  description: combo.description,
  price: money(combo.price),
  startDate: combo.startDate,
  endDate: combo.endDate,
  isActive: combo.isActive,
  items: (combo.items ?? []).map((item: any) => ({
    id: item.id,
    quantity: item.quantity,
    variantLabel: item.variantLabel,
    variantPrice: money(item.variantPrice),
    product: productDto(item.product),
  })),
});

const todayStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const normalizeDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("INVALID_DATE");
  }
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const assertBusinessProducts = async (
  businessId: number,
  productIds: number[]
) => {
  const uniqueIds = [...new Set(productIds)];
  const count = await prisma.product.count({
    where: {
      id: { in: uniqueIds },
      businessId,
      isActive: true,
    },
  });
  if (count !== uniqueIds.length) {
    throw new Error("INVALID_PRODUCT");
  }
};

export const getMenuProductsService = async (businessId: number) => {
  const products = await prisma.product.findMany({
    where: { businessId, isActive: true },
    include: { category: true },
    orderBy: [{ category: { position: "asc" } }, { position: "asc" }],
  });
  return products.map(productDto);
};

export const getComboOffersService = async (businessId: number) => {
  const combos = await prisma.comboOffer.findMany({
    where: { businessId, isActive: true },
    include: {
      items: {
        include: { product: { include: { category: true } } },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { id: "desc" },
  });
  return combos.map(comboDto);
};

export const createComboOfferService = async (input: ComboInput) => {
  if (!input.name?.trim()) throw new Error("NAME_REQUIRED");
  if (!input.items?.length) throw new Error("ITEMS_REQUIRED");
  await assertBusinessProducts(
    input.businessId,
    input.items.map((item) => Number(item.productId))
  );

  const startDate = normalizeDate(input.startDate);
  const endDate = normalizeDate(input.endDate);
  if (startDate && endDate && startDate > endDate) {
    throw new Error("INVALID_DATE_RANGE");
  }

  const combo = await prisma.comboOffer.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      price: input.price ?? null,
      startDate,
      endDate,
      businessId: input.businessId,
      items: {
        create: input.items.map((item) => ({
          productId: Number(item.productId),
          quantity: Math.max(1, Number(item.quantity ?? 1)),
          variantLabel: item.variantLabel?.trim() || null,
          variantPrice:
            item.variantPrice === null || item.variantPrice === undefined
              ? null
              : Number(item.variantPrice),
        })),
      },
    },
    include: {
      items: { include: { product: { include: { category: true } } } },
    },
  });
  sendRealtimeUpdate(input.businessId, "COMBO_UPDATED", combo, input.token);
  void broadcastBusinessDisplayConfigs(input.businessId);
  return comboDto(combo);
};

export const updateComboOfferService = async (input: ComboInput) => {
  if (!input.comboId) throw new Error("COMBO_ID_REQUIRED");
  if (!input.name?.trim()) throw new Error("NAME_REQUIRED");
  if (!input.items?.length) throw new Error("ITEMS_REQUIRED");
  await assertBusinessProducts(
    input.businessId,
    input.items.map((item) => Number(item.productId))
  );

  const startDate = normalizeDate(input.startDate);
  const endDate = normalizeDate(input.endDate);
  if (startDate && endDate && startDate > endDate) {
    throw new Error("INVALID_DATE_RANGE");
  }

  const existing = await prisma.comboOffer.findFirst({
    where: { id: input.comboId, businessId: input.businessId, isActive: true },
  });
  if (!existing) throw new Error("COMBO_NOT_FOUND");

  const combo = await prisma.$transaction(async (tx) => {
    await tx.comboOfferItem.deleteMany({ where: { comboId: input.comboId } });
    return tx.comboOffer.update({
      where: { id: input.comboId },
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        price: input.price ?? null,
        startDate,
        endDate,
        items: {
          create: input.items.map((item) => ({
            productId: Number(item.productId),
            quantity: Math.max(1, Number(item.quantity ?? 1)),
            variantLabel: item.variantLabel?.trim() || null,
            variantPrice:
              item.variantPrice === null || item.variantPrice === undefined
                ? null
                : Number(item.variantPrice),
          })),
        },
      },
      include: {
        items: { include: { product: { include: { category: true } } } },
      },
    });
  });
  sendRealtimeUpdate(input.businessId, "COMBO_UPDATED", combo, input.token);
  void broadcastBusinessDisplayConfigs(input.businessId);
  return comboDto(combo);
};

export const deleteComboOfferService = async (
  businessId: number,
  comboId: number,
  token?: string
) => {
  const combo = await prisma.comboOffer.findFirst({
    where: { id: comboId, businessId, isActive: true },
  });
  if (!combo) throw new Error("COMBO_NOT_FOUND");
  await prisma.comboOffer.update({
    where: { id: comboId },
    data: { isActive: false },
  });
  sendRealtimeUpdate(businessId, "COMBO_UPDATED", { id: comboId }, token);
  void broadcastBusinessDisplayConfigs(businessId);
};

export const getTodaysStarService = async (businessId: number) => {
  const stars = await prisma.todaysStar.findMany({
    where: {
      businessId,
      starDate: todayStart(),
    },
    include: { product: { include: { category: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (!stars.length) return null;
  return {
    id: stars[0].id,
    starDate: stars[0].starDate,
    product: productDto(stars[0].product),
    products: stars.map((star) => productDto(star.product)),
  };
};

export const setTodaysStarService = async (
  businessId: number,
  productIds: number[],
  token?: string
) => {
  const uniqueIds = [...new Set(productIds.map(Number))].filter(Boolean);
  if (!uniqueIds.length) throw new Error("PRODUCT_REQUIRED");
  await assertBusinessProducts(businessId, uniqueIds);
  const starDate = todayStart();
  const stars = await prisma.$transaction(async (tx) => {
    await tx.todaysStar.deleteMany({ where: { businessId, starDate } });
    await tx.todaysStar.createMany({
      data: uniqueIds.map((productId) => ({
        businessId,
        productId,
        starDate,
      })),
    });
    return tx.todaysStar.findMany({
      where: { businessId, starDate },
      include: { product: { include: { category: true } } },
      orderBy: { createdAt: "asc" },
    });
  });
  const response = {
    id: stars[0].id,
    starDate: stars[0].starDate,
    product: productDto(stars[0].product),
    products: stars.map((star) => productDto(star.product)),
  };
  sendRealtimeUpdate(businessId, "TODAYS_STAR_UPDATED", response, token);
  void broadcastBusinessDisplayConfigs(businessId);
  return response;
};
