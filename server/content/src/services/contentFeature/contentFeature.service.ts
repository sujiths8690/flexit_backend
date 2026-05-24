import prisma from "../../config/prisma";
import { sendRealtimeUpdate } from "../../utils/realtimeClient";
import { broadcastBusinessDisplayConfigs } from "../../utils/deviceDisplayRealtime";
import {
  deleteCachedKey,
  getCachedJson,
  setCachedJson,
} from "../../utils/cacheClient";

type ComboItemInput = {
  productId: number;
  quantity?: number;
  variantLabel?: string | null;
  variantPrice?: number | null;
  discountPrice?: number | null;
  buyQuantity?: number | null;
  freeQuantity?: number | null;
  freeProductId?: number | null;
  freeVariantLabel?: string | null;
  freeVariantPrice?: number | null;
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

type OfferInput = {
  offerId?: number;
  businessId: number;
  name: string;
  offerType: "discount" | "free";
  discountPrice?: number | null;
  buyQuantity?: number | null;
  freeProductId?: number | null;
  freeQuantity?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  items: ComboItemInput[];
  token?: string;
};

type NoticeInput = {
  noticeId?: number;
  businessId: number;
  content: string;
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

const offerDto = (offer: any) => ({
  id: offer.id,
  name: offer.name,
  offerType: offer.offerType,
  discountPrice: money(offer.discountPrice),
  buyQuantity: offer.buyQuantity,
  freeQuantity: offer.freeQuantity,
  startDate: offer.startDate,
  endDate: offer.endDate,
  isActive: offer.isActive,
  freeProductId: offer.freeProductId,
  freeProduct: offer.freeProduct ? productDto(offer.freeProduct) : null,
  items: (offer.items ?? []).map((item: any) => ({
    id: item.id,
    quantity: item.quantity,
    variantLabel: item.variantLabel,
    variantPrice: money(item.variantPrice),
    discountPrice: money(item.discountPrice),
    buyQuantity: item.buyQuantity,
    freeQuantity: item.freeQuantity,
    freeProductId: item.freeProductId,
    freeVariantLabel: item.freeVariantLabel,
    freeVariantPrice: money(item.freeVariantPrice),
    freeProduct: item.freeProduct ? productDto(item.freeProduct) : null,
    product: productDto(item.product),
  })),
});

const noticeDto = (notice: any) => ({
  id: notice.id,
  content: notice.content,
  isActive: notice.isActive,
  createdAt: notice.createdAt,
  updatedAt: notice.updatedAt,
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

const menuContentOverviewCacheKey = (businessId: number) =>
  `business:${businessId}:menu-content:all`;

export const invalidateMenuContentOverviewCache = async (businessId: number) =>
  deleteCachedKey(menuContentOverviewCacheKey(businessId));

export const getMenuProductsService = async (businessId: number) => {
  const products = await prisma.product.findMany({
    where: { businessId, isActive: true },
    include: { category: true },
    orderBy: [{ category: { position: "asc" } }, { position: "asc" }],
  });
  return products.map(productDto);
};

export const getMenuContentOverviewService = async (businessId: number) => {
  const cacheKey = menuContentOverviewCacheKey(businessId);
  const cached = await getCachedJson(cacheKey);
  if (cached) return cached;

  const [products, comboOffers, offers, notices, todaysStar] =
    await Promise.all([
      getMenuProductsService(businessId),
      getComboOffersService(businessId),
      getOffersService(businessId),
      getNoticesService(businessId),
      getTodaysStarService(businessId),
    ]);

  const overview = {
    products,
    comboOffers,
    offers,
    notices,
    todaysStar,
  };
  await setCachedJson(cacheKey, overview);
  return overview;
};

export const getComboOffersService = async (businessId: number) => {
  const combos = await prisma.comboOffer.findMany({
    where: { businessId, isActive: true },
    include: {
      items: {
        include: {
          product: { include: { category: true } },
        },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { id: "desc" },
  });
  return combos.map(comboDto);
};

export const getOffersService = async (businessId: number) => {
  const offers = await prisma.offer.findMany({
    where: { businessId, isActive: true },
    include: {
      freeProduct: { include: { category: true } },
      items: {
        include: {
          product: { include: { category: true } },
          freeProduct: { include: { category: true } },
        },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { id: "desc" },
  });
  return offers.map(offerDto);
};

export const getNoticesService = async (businessId: number) => {
  const notices = await prisma.notice.findMany({
    where: { businessId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return notices.map(noticeDto);
};

const normalizedOfferType = (value: unknown) => {
  const type = String(value ?? "").trim().toLowerCase();
  if (type !== "discount" && type !== "free") {
    throw new Error("INVALID_OFFER_TYPE");
  }
  return type as "discount" | "free";
};

const validateOfferInput = async (input: OfferInput) => {
  if (!input.name?.trim()) throw new Error("NAME_REQUIRED");
  if (!input.items?.length) throw new Error("ITEMS_REQUIRED");

  const offerType = normalizedOfferType(input.offerType);
  const productIds = input.items.map((item) => Number(item.productId));
  if (offerType === "free") {
    for (const item of input.items) {
      productIds.push(Number(item.freeProductId ?? input.freeProductId));
    }
  }
  await assertBusinessProducts(input.businessId, productIds);

  const startDate = normalizeDate(input.startDate);
  const endDate = normalizeDate(input.endDate);
  if (!startDate || !endDate) {
    throw new Error("OFFER_PERIOD_REQUIRED");
  }
  if (startDate && endDate && startDate > endDate) {
    throw new Error("INVALID_DATE_RANGE");
  }

  if (offerType === "discount") {
    const hasItemDiscounts = input.items.every((item) => {
      const discountPrice = Number(item.discountPrice ?? input.discountPrice);
      return Number.isFinite(discountPrice) && discountPrice > 0;
    });
    if (!hasItemDiscounts) {
      throw new Error("DISCOUNT_PRICE_REQUIRED");
    }
    return {
      offerType,
      startDate,
      endDate,
      discountPrice: null,
      buyQuantity: null,
      freeProductId: null,
      freeQuantity: null,
    };
  }

  const hasFreeItems = input.items.every((item) => {
    const freeProductId = Number(item.freeProductId ?? input.freeProductId);
    const freeQuantity = Number(item.freeQuantity ?? input.freeQuantity ?? 1);
    const buyQuantity = Number(item.buyQuantity ?? item.quantity ?? input.buyQuantity ?? 1);
    return (
      Number.isInteger(freeProductId) &&
      freeProductId > 0 &&
      Number.isFinite(freeQuantity) &&
      freeQuantity > 0 &&
      Number.isFinite(buyQuantity) &&
      buyQuantity > 0
    );
  });
  if (!hasFreeItems) {
    throw new Error("FREE_PRODUCT_REQUIRED");
  }

  return {
    offerType,
    startDate,
    endDate,
    discountPrice: null,
    buyQuantity: null,
    freeProductId: null,
    freeQuantity: null,
  };
};

const offerItemCreateData = (
  items: ComboItemInput[],
  offerType?: "discount" | "free",
  fallbackDiscountPrice?: number | null,
  fallbackFreeProductId?: number | null,
  fallbackFreeQuantity?: number | null,
  fallbackBuyQuantity?: number | null
) =>
  items.map((item) => ({
    productId: Number(item.productId),
    quantity: Math.max(1, Number(item.quantity ?? 1)),
    variantLabel: item.variantLabel?.trim() || null,
    variantPrice:
      item.variantPrice === null || item.variantPrice === undefined
        ? null
        : Number(item.variantPrice),
    discountPrice:
      offerType === "discount"
        ? Number(item.discountPrice ?? fallbackDiscountPrice)
        : null,
    buyQuantity:
      offerType === "free"
        ? Math.max(1, Number(item.buyQuantity ?? item.quantity ?? fallbackBuyQuantity ?? 1))
        : null,
    freeQuantity:
      offerType === "free"
        ? Math.max(1, Number(item.freeQuantity ?? fallbackFreeQuantity ?? 1))
        : null,
    freeProductId:
      offerType === "free"
        ? Number(item.freeProductId ?? fallbackFreeProductId)
        : null,
    freeVariantLabel:
      offerType === "free" ? item.freeVariantLabel?.trim() || null : null,
    freeVariantPrice:
      offerType === "free" &&
      item.freeVariantPrice !== null &&
      item.freeVariantPrice !== undefined
        ? Number(item.freeVariantPrice)
        : null,
  }));

export const createOfferService = async (input: OfferInput) => {
  const offerData = await validateOfferInput(input);
  const offer = await prisma.offer.create({
    data: {
      name: input.name.trim(),
      ...offerData,
      businessId: input.businessId,
      items: {
        create: offerItemCreateData(
          input.items,
          offerData.offerType,
          input.discountPrice,
          input.freeProductId,
          input.freeQuantity,
          input.buyQuantity
        ),
      },
    },
    include: {
      freeProduct: { include: { category: true } },
      items: {
        include: {
          product: { include: { category: true } },
          freeProduct: { include: { category: true } },
        },
      },
    },
  });
  void invalidateMenuContentOverviewCache(input.businessId);
  sendRealtimeUpdate(input.businessId, "OFFERS_UPDATED", offer, input.token);
  void broadcastBusinessDisplayConfigs(input.businessId);
  return offerDto(offer);
};

export const updateOfferService = async (input: OfferInput) => {
  if (!input.offerId) throw new Error("OFFER_ID_REQUIRED");
  const existing = await prisma.offer.findFirst({
    where: { id: input.offerId, businessId: input.businessId, isActive: true },
  });
  if (!existing) throw new Error("OFFER_NOT_FOUND");

  const offerData = await validateOfferInput(input);
  const offer = await prisma.$transaction(async (tx) => {
    await tx.offerItem.deleteMany({ where: { offerId: input.offerId } });
    return tx.offer.update({
      where: { id: input.offerId },
      data: {
        name: input.name.trim(),
        ...offerData,
        items: {
          create: offerItemCreateData(
            input.items,
            offerData.offerType,
            input.discountPrice,
            input.freeProductId,
            input.freeQuantity,
            input.buyQuantity
          ),
        },
      },
      include: {
        freeProduct: { include: { category: true } },
        items: {
          include: {
            product: { include: { category: true } },
            freeProduct: { include: { category: true } },
          },
        },
      },
    });
  });
  void invalidateMenuContentOverviewCache(input.businessId);
  sendRealtimeUpdate(input.businessId, "OFFERS_UPDATED", offer, input.token);
  void broadcastBusinessDisplayConfigs(input.businessId);
  return offerDto(offer);
};

export const deleteOfferService = async (
  businessId: number,
  offerId: number,
  token?: string
) => {
  const offer = await prisma.offer.findFirst({
    where: { id: offerId, businessId, isActive: true },
  });
  if (!offer) throw new Error("OFFER_NOT_FOUND");
  await prisma.offer.update({
    where: { id: offerId },
    data: { isActive: false },
  });
  void invalidateMenuContentOverviewCache(businessId);
  sendRealtimeUpdate(businessId, "OFFERS_UPDATED", { id: offerId }, token);
  void broadcastBusinessDisplayConfigs(businessId);
};

export const createNoticeService = async (input: NoticeInput) => {
  const content = input.content?.trim();
  if (!content) throw new Error("CONTENT_REQUIRED");

  const notice = await prisma.notice.create({
    data: {
      content,
      businessId: input.businessId,
    },
  });
  void invalidateMenuContentOverviewCache(input.businessId);
  sendRealtimeUpdate(input.businessId, "NOTICES_UPDATED", notice, input.token);
  void broadcastBusinessDisplayConfigs(input.businessId);
  return noticeDto(notice);
};

export const updateNoticeService = async (input: NoticeInput) => {
  if (!input.noticeId) throw new Error("NOTICE_ID_REQUIRED");
  const content = input.content?.trim();
  if (!content) throw new Error("CONTENT_REQUIRED");

  const existing = await prisma.notice.findFirst({
    where: {
      id: input.noticeId,
      businessId: input.businessId,
      isActive: true,
    },
  });
  if (!existing) throw new Error("NOTICE_NOT_FOUND");

  const notice = await prisma.notice.update({
    where: { id: input.noticeId },
    data: { content },
  });
  void invalidateMenuContentOverviewCache(input.businessId);
  sendRealtimeUpdate(input.businessId, "NOTICES_UPDATED", notice, input.token);
  void broadcastBusinessDisplayConfigs(input.businessId);
  return noticeDto(notice);
};

export const deleteNoticeService = async (
  businessId: number,
  noticeId: number,
  token?: string
) => {
  const notice = await prisma.notice.findFirst({
    where: { id: noticeId, businessId, isActive: true },
  });
  if (!notice) throw new Error("NOTICE_NOT_FOUND");
  await prisma.notice.update({
    where: { id: noticeId },
    data: { isActive: false },
  });
  void invalidateMenuContentOverviewCache(businessId);
  sendRealtimeUpdate(businessId, "NOTICES_UPDATED", { id: noticeId }, token);
  void broadcastBusinessDisplayConfigs(businessId);
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
  void invalidateMenuContentOverviewCache(input.businessId);
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
  void invalidateMenuContentOverviewCache(input.businessId);
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
  void invalidateMenuContentOverviewCache(businessId);
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
  void invalidateMenuContentOverviewCache(businessId);
  sendRealtimeUpdate(businessId, "TODAYS_STAR_UPDATED", response, token);
  void broadcastBusinessDisplayConfigs(businessId);
  return response;
};
