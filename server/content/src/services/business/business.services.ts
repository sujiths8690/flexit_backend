import prisma from "../../config/prisma";
import { broadcastBusinessDisplayConfigs } from "../../utils/deviceDisplayRealtime";
import { sendAdminRealtimeUpdate, sendRealtimeUpdate } from "../../utils/realtimeClient";

type SubscriptionPlanInput = {
  id?: string;
  name?: string;
  status?: string;
  amount?: number;
  currency?: string;
  startedAt?: string;
  trialEndsAt?: string;
  method?: string;
};

type PlanCustomerInput = {
  id?: number;
  name?: string;
  email?: string;
  phone?: string;
};

const planAmount = (value: any) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
};

const optionalDate = (value?: string) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const transactionCode = (prefix: string, businessId: number) =>
  `${prefix}-${businessId}-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const serializePlanTransaction = (transaction: any) => ({
  id: transaction.id,
  transactionId: transaction.transactionId,
  invoiceId: transaction.invoiceId,
  amount: Number(transaction.amount ?? 0),
  currency: transaction.currency ?? "INR",
  status: transaction.status ?? "success",
  method: transaction.method ?? "plan",
  planId: transaction.planId,
  planName: transaction.planName,
  description: transaction.description,
  customerId: transaction.customerId,
  customerName: transaction.customerName,
  customerEmail: transaction.customerEmail,
  customerPhone: transaction.customerPhone,
  businessId: transaction.businessId,
  businessName: transaction.business?.name ?? "",
  businessEmail: transaction.business?.email ?? "",
  businessMobile: transaction.business?.mobile ?? "",
  businessAddress: transaction.business?.address ?? "",
  createdAt: transaction.createdAt,
  updatedAt: transaction.updatedAt,
  rawDetails: transaction.rawDetails
});

const serializeAdminOffer = (offer: any) => ({
  id: offer.id,
  type: offer.type,
  planId: offer.planId,
  planName: offer.planName,
  originalAmount:
    offer.originalAmount == null ? null : Number(offer.originalAmount),
  amount: offer.offerAmount == null ? null : Number(offer.offerAmount),
  offerAmount: offer.offerAmount == null ? null : Number(offer.offerAmount),
  currency: offer.currency ?? "INR",
  extensionDays: offer.extensionDays,
  previousEndsAt: offer.previousEndsAt,
  newEndsAt: offer.newEndsAt,
  validUntil: offer.validUntil,
  expiresAt: offer.validUntil,
  createdAt: offer.createdAt
});

const isOfferActive = (offer: any, now = new Date()) => {
  if (!offer || offer.type !== "PLAN_OFFER") return false;
  if (!offer.validUntil) return true;
  return new Date(offer.validUntil).getTime() >= now.getTime();
};

const fallbackActiveOffer = (business: any, now = new Date()) => {
  if (!business.subscriptionOfferPlanId) return null;
  if (
    business.subscriptionOfferExpiresAt &&
    new Date(business.subscriptionOfferExpiresAt).getTime() < now.getTime()
  ) {
    return null;
  }
  return {
    type: "PLAN_OFFER",
    planId: business.subscriptionOfferPlanId,
    planName: business.subscriptionOfferPlanName,
    originalAmount:
      business.subscriptionOfferOriginalAmount == null
        ? null
        : Number(business.subscriptionOfferOriginalAmount),
    amount:
      business.subscriptionOfferAmount == null
        ? null
        : Number(business.subscriptionOfferAmount),
    offerAmount:
      business.subscriptionOfferAmount == null
        ? null
        : Number(business.subscriptionOfferAmount),
    currency: business.subscriptionOfferCurrency ?? "INR",
    expiresAt: business.subscriptionOfferExpiresAt,
    validUntil: business.subscriptionOfferExpiresAt,
    createdAt: business.subscriptionOfferCreatedAt
  };
};

const fallbackExtensionOffer = (business: any) => {
  if (!business.subscriptionExtensionDays || !business.subscriptionExtensionNewEndsAt) {
    return null;
  }
  return {
    type: "PLAN_EXTENSION",
    extensionDays: business.subscriptionExtensionDays,
    previousEndsAt: business.subscriptionExtensionPreviousEndsAt,
    newEndsAt: business.subscriptionExtensionNewEndsAt,
    currency: "INR",
    createdAt: business.subscriptionExtensionCreatedAt
  };
};

const hasSameAdminOffer = (offers: any[], target: any) =>
  offers.some((offer) =>
    offer.type === target.type &&
    offer.planId === target.planId &&
    Number(offer.offerAmount ?? 0) === Number(target.offerAmount ?? 0) &&
    offer.extensionDays === target.extensionDays &&
    String(offer.newEndsAt ?? "") === String(target.newEndsAt ?? "")
  );

const businessWithAdminOffers = {
  adminOffers: { orderBy: { createdAt: "desc" as const } }
};

const isMissingAdminOfferTable = (error: any) =>
  String(error?.message ?? error).includes("BusinessAdminOffer") &&
  String(error?.message ?? error).toLowerCase().includes("does not exist");

const isMissingExtensionFallbackColumns = (error: any) =>
  String(error?.message ?? error).includes("subscriptionExtension");

const findBusinessWithOptionalAdminOffers = async (id: number) => {
  try {
    return await (prisma as any).business.findUnique({
      where: { id },
      include: businessWithAdminOffers,
    });
  } catch (error: any) {
    if (!isMissingAdminOfferTable(error)) throw error;
    return prisma.business.findUnique({ where: { id } });
  }
};

const createAdminOfferIfAvailable = async (data: any) => {
  try {
    await (prisma as any).businessAdminOffer.create({ data });
  } catch (error: any) {
    if (!isMissingAdminOfferTable(error)) throw error;
  }
};

const serializeBusiness = (business: any) => {
  const now = new Date();
  const offers: any[] = ((business.adminOffers as any[]) ?? []).map(serializeAdminOffer);
  const extensionFallback = fallbackExtensionOffer(business);
  if (extensionFallback && !hasSameAdminOffer(offers, extensionFallback)) {
    offers.unshift(extensionFallback);
  }
  const activeStoredOffer = ((business.adminOffers as any[]) ?? []).find((offer) =>
    isOfferActive(offer, now)
  );
  const activeOffer = activeStoredOffer
    ? serializeAdminOffer(activeStoredOffer)
    : fallbackActiveOffer(business, now);
  const hasSubscriptionData =
    Boolean(business.subscriptionPlanId) ||
    Boolean(activeOffer) ||
    offers.length > 0;

  return {
    ...business,
    adminOffers: offers,
    subscriptionAmount: Number(business.subscriptionAmount ?? 0),
    subscriptionOfferOriginalAmount:
      business.subscriptionOfferOriginalAmount == null
        ? null
        : Number(business.subscriptionOfferOriginalAmount),
    subscriptionOfferAmount:
      business.subscriptionOfferAmount == null
        ? null
        : Number(business.subscriptionOfferAmount),
    subscriptionPlan: hasSubscriptionData
      ? {
          id: business.subscriptionPlanId,
          name: business.subscriptionPlanName,
          status: business.subscriptionStatus,
          amount: Number(business.subscriptionAmount ?? 0),
          currency: business.subscriptionCurrency ?? "INR",
          startedAt: business.subscriptionStartedAt,
          trialEndsAt: business.subscriptionTrialEndsAt,
          offer: activeOffer,
          offers,
        }
      : null,
  };
};

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
  subscriptionPlan,
  customer,
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
  subscriptionPlan?: SubscriptionPlanInput;
  customer?: PlanCustomerInput;
}) => {
  const amount = planAmount(subscriptionPlan?.amount);
  const currency = subscriptionPlan?.currency || "INR";
  const status = subscriptionPlan?.status || (amount > 0 ? "success" : "trialing");
  const startedAt = optionalDate(subscriptionPlan?.startedAt) ?? new Date();
  const trialEndsAt = optionalDate(subscriptionPlan?.trialEndsAt);

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
      ...(subscriptionPlan && {
        subscriptionPlanId: subscriptionPlan.id,
        subscriptionPlanName: subscriptionPlan.name,
        subscriptionStatus: status,
        subscriptionAmount: amount,
        subscriptionCurrency: currency,
        subscriptionStartedAt: startedAt,
        subscriptionTrialEndsAt: trialEndsAt,
      }),
      isActive: true,
    } as any,
  });

  if (subscriptionPlan) {
    await (prisma as any).planTransaction.create({
      data: {
        transactionId: transactionCode("TXN", business.id),
        invoiceId: transactionCode("INV", business.id),
        amount,
        currency,
        status,
        method: subscriptionPlan.method || "plan",
        planId: subscriptionPlan.id,
        planName: subscriptionPlan.name,
        description: `${subscriptionPlan.name || "Subscription"} plan purchase`,
        customerId: customer?.id,
        customerName: customer?.name,
        customerEmail: customer?.email ?? email,
        customerPhone: customer?.phone ?? mobile,
        businessId: business.id,
        rawDetails: {
          subscriptionPlan,
          customer
        }
      }
    });
  }

  void sendAdminRealtimeUpdate("ADMIN_DASHBOARD_UPDATED", {
    source: "content",
    eventType: "BUSINESS_CREATED",
    businessId: business.id,
    businessName: business.name,
    planName: subscriptionPlan?.name,
    amount,
  });

  return serializeBusiness(business);
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

  const business = await findBusinessWithOptionalAdminOffers(id);

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

  return serializeBusiness(updated);
};

export const getBusinessByIdService = async (id: number) => {

  const business = await findBusinessWithOptionalAdminOffers(id);

  if (!business) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  return serializeBusiness(business);
};

export const extendBusinessPlanService = async ({
  id,
  days,
}: {
  id: number;
  days: number;
}) => {
  if (!Number.isInteger(days) || days < 1 || days > 30) {
    throw new Error("INVALID_EXTENSION_DAYS");
  }

  const business = await prisma.business.findUnique({ where: { id } });
  if (!business) throw new Error("BUSINESS_NOT_FOUND");

  const currentEnd =
    (business as any).subscriptionTrialEndsAt instanceof Date
      ? (business as any).subscriptionTrialEndsAt
      : null;
  const base = currentEnd && currentEnd > new Date() ? currentEnd : new Date();
  const nextEnd = new Date(base);
  nextEnd.setDate(nextEnd.getDate() + days);

  try {
    await prisma.business.update({
      where: { id },
      data: {
        subscriptionTrialEndsAt: nextEnd,
        subscriptionStatus: "active",
        subscriptionExtensionDays: days,
        subscriptionExtensionPreviousEndsAt: currentEnd,
        subscriptionExtensionNewEndsAt: nextEnd,
        subscriptionExtensionCreatedAt: new Date(),
      } as any,
    });
  } catch (error: any) {
    if (!isMissingExtensionFallbackColumns(error)) throw error;
    await prisma.business.update({
      where: { id },
      data: {
        subscriptionTrialEndsAt: nextEnd,
        subscriptionStatus: "active",
      } as any,
    });
  }
  await createAdminOfferIfAvailable({
    businessId: id,
    type: "PLAN_EXTENSION",
    extensionDays: days,
    previousEndsAt: currentEnd,
    newEndsAt: nextEnd,
    currency: "INR",
  });
  const updated = await findBusinessWithOptionalAdminOffers(id);

  void broadcastBusinessDisplayConfigs(id);
  void sendAdminRealtimeUpdate("ADMIN_DASHBOARD_UPDATED", {
    source: "content",
    eventType: "BUSINESS_PLAN_EXTENDED",
    businessId: id,
    planName: (business as any).subscriptionPlanName,
    extensionDays: days,
    planEndsAt: nextEnd,
  });
  void sendRealtimeUpdate(id, "BUSINESS_PLAN_EXTENDED", {
    businessId: id,
    planName: (business as any).subscriptionPlanName,
    extensionDays: days,
    planEndsAt: nextEnd,
  });

  return serializeBusiness(updated);
};

export const setBusinessPlanOfferService = async ({
  id,
  planId,
  planName,
  originalAmount,
  offerAmount,
  validUntil,
}: {
  id: number;
  planId: string;
  planName: string;
  originalAmount: number;
  offerAmount: number;
  validUntil?: string;
}) => {
  const normalizedPlanId = planId.trim().toLowerCase();
  const normalizedPlanName = planName.trim();
  if (!normalizedPlanId || !normalizedPlanName) throw new Error("PLAN_REQUIRED");
  if (!Number.isFinite(originalAmount) || originalAmount < 0) {
    throw new Error("INVALID_PLAN_AMOUNT");
  }
  if (
    !Number.isFinite(offerAmount) ||
    offerAmount < 0 ||
    offerAmount >= originalAmount
  ) {
    throw new Error("INVALID_OFFER_AMOUNT");
  }
  const offerValidUntil = optionalDate(validUntil);
  if (!offerValidUntil || offerValidUntil.getTime() < Date.now()) {
    throw new Error("INVALID_OFFER_EXPIRY");
  }

  const business = await prisma.business.findUnique({ where: { id } });
  if (!business) throw new Error("BUSINESS_NOT_FOUND");

  await prisma.business.update({
    where: { id },
    data: {
      subscriptionOfferPlanId: normalizedPlanId,
      subscriptionOfferPlanName: normalizedPlanName,
      subscriptionOfferOriginalAmount: originalAmount,
      subscriptionOfferAmount: offerAmount,
      subscriptionOfferCurrency: "INR",
      subscriptionOfferExpiresAt: offerValidUntil,
      subscriptionOfferCreatedAt: new Date(),
    } as any,
  });
  await createAdminOfferIfAvailable({
    businessId: id,
    type: "PLAN_OFFER",
    planId: normalizedPlanId,
    planName: normalizedPlanName,
    originalAmount,
    offerAmount,
    currency: "INR",
    validUntil: offerValidUntil,
  });
  const updated = await findBusinessWithOptionalAdminOffers(id);

  void sendAdminRealtimeUpdate("ADMIN_DASHBOARD_UPDATED", {
    source: "content",
    eventType: "BUSINESS_PLAN_OFFER_SENT",
    businessId: id,
    planName: normalizedPlanName,
    offerAmount,
  });
  void sendRealtimeUpdate(id, "BUSINESS_PLAN_OFFER_SENT", {
    businessId: id,
    planId: normalizedPlanId,
    planName: normalizedPlanName,
    originalAmount,
    offerAmount,
    validUntil: offerValidUntil,
  });

  return serializeBusiness(updated);
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

export const getAdminRevenueOverviewService = async () => {
  const transactions = await (prisma as any).planTransaction.findMany({
    include: { business: true },
    orderBy: { createdAt: "desc" }
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const successful = transactions.filter((transaction: any) =>
    String(transaction.status).toLowerCase() === "success"
  );
  const totalRevenue = successful.reduce(
    (sum: number, transaction: any) => sum + Number(transaction.amount ?? 0),
    0
  );
  const revenueThisMonth = successful
    .filter((transaction: any) => transaction.createdAt >= monthStart)
    .reduce(
      (sum: number, transaction: any) => sum + Number(transaction.amount ?? 0),
      0
    );

  return {
    totalRevenue,
    revenueThisMonth,
    transactions: transactions.map(serializePlanTransaction)
  };
};

