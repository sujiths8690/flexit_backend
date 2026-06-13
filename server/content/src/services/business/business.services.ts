import prisma from "../../config/prisma";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import Razorpay from "razorpay";
import { broadcastBusinessDisplayConfigs } from "../../utils/deviceDisplayRealtime";
import { sendMobilePush } from "../../utils/mobilePush";
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

type RazorpayOrderInput = {
  businessId: number;
  userId?: number;
  planId: string;
};

type PaymentLinkTokenInput = RazorpayOrderInput & {
  role?: string;
};

type RazorpayVerifyInput = RazorpayOrderInput & {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

const defaultPlanConfigs = [
  {
    id: "trial",
    name: "Trial",
    summary: "Try Flexit with one TV before choosing a paid tier.",
    minTvDevices: 1,
    maxTvDevices: 1,
    amount: 0,
    currency: "INR",
    trialDays: 20,
    features: ["20 days free", "Connect 1 TV", "All core menu tools"],
  },
  {
    id: "clay",
    name: "Clay",
    summary: "Starter plan for a single counter, branch, or display.",
    minTvDevices: 1,
    maxTvDevices: 1,
    amount: 999,
    currency: "INR",
    trialDays: null,
    features: ["Connect 1 TV", "Menu and media controls", "Business display settings"],
  },
  {
    id: "metal",
    name: "Metal",
    summary: "For growing shops with multiple screens.",
    minTvDevices: 2,
    maxTvDevices: 4,
    amount: 2499,
    currency: "INR",
    trialDays: null,
    features: ["Connect 2-4 TVs", "Multi-screen management", "Recommended for busy outlets"],
  },
  {
    id: "steel",
    name: "Steel",
    summary: "For larger businesses running several menu boards.",
    minTvDevices: 4,
    maxTvDevices: 8,
    amount: 4999,
    currency: "INR",
    trialDays: null,
    features: ["Connect 4-8 TVs", "Full display controls", "Built for multi-zone menus"],
  },
];

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

const razorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("RAZORPAY_NOT_CONFIGURED");
  return {
    keyId,
    client: new Razorpay({ key_id: keyId, key_secret: keySecret }),
  };
};

const amountToPaise = (amount: number) => Math.round(amount * 100);

const verifyRazorpaySignature = ({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("RAZORPAY_NOT_CONFIGURED");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
};

const paymentJwtSecret = () =>
  process.env.PAYMENT_JWT_SECRET ||
  process.env.JWT_SECRET ||
  "local-payment-secret";

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

const serializePlanConfig = (plan: any, now = new Date()) => {
  const discountEndsAt = plan.discountEndsAt ?? null;
  const discountActive =
    plan.discountName &&
    plan.discountAmount != null &&
    (!discountEndsAt || new Date(discountEndsAt).getTime() >= now.getTime());
  return {
    id: plan.id,
    name: plan.name,
    summary: plan.summary,
    minTvDevices: plan.minTvDevices,
    maxTvDevices: plan.maxTvDevices,
    amount: Number(plan.amount ?? 0),
    currency: plan.currency ?? "INR",
    trialDays: plan.trialDays,
    features: Array.isArray(plan.features) ? plan.features : [],
    discountName: discountActive ? plan.discountName : null,
    discountAmount: discountActive ? Number(plan.discountAmount) : null,
    discountEndsAt: discountActive ? discountEndsAt : null,
    updatedAt: plan.updatedAt,
  };
};

const serializeMobileNotification = (notification: any) => ({
  id: notification.id,
  target: notification.target ?? "BUSINESS",
  businessId: notification.businessId,
  businessName: notification.business?.name ?? null,
  title: notification.title,
  message: notification.message,
  category: notification.category ?? "GENERAL",
  meta: notification.meta ?? {},
  sentAt: notification.sentAt,
});

const activeBusinessIds = async () => {
  const businesses = await prisma.business.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  return businesses.map((business) => business.id);
};

const mobilePushTokensForBusinesses = async (businessIds: number[]) => {
  if (businessIds.length === 0) return [];
  const tokens = await (prisma as any).mobilePushToken.findMany({
    where: {
      businessId: { in: businessIds },
      isActive: true,
      app: "tex_flutter_app",
    },
    select: { token: true },
  });
  return tokens.map((item: any) => item.token).filter(Boolean);
};

const deactivatePushTokens = async (tokens: string[]) => {
  if (tokens.length === 0) return;
  await (prisma as any).mobilePushToken.updateMany({
    where: { token: { in: tokens } },
    data: { isActive: false },
  });
};

const broadcastMobileNotification = async (notification: any) => {
  const payload = serializeMobileNotification(notification);
  const ids =
    notification.target === "ALL"
      ? await activeBusinessIds()
      : notification.businessId
        ? [notification.businessId]
        : [];

  for (const businessId of ids) {
    void sendRealtimeUpdate(businessId, "MOBILE_NOTIFICATION", payload);
  }
  void (async () => {
    const tokens = await mobilePushTokensForBusinesses(ids);
    const result = await sendMobilePush(tokens, {
      title: payload.title,
      message: payload.message,
      category: payload.category,
      notificationId: payload.id,
      data: payload,
    });
    await deactivatePushTokens(result.failedTokens);
  })();
  void sendAdminRealtimeUpdate("ADMIN_DASHBOARD_UPDATED", {
    source: "content",
    eventType: "MOBILE_NOTIFICATION_SENT",
    notificationId: notification.id,
  });
};

const createStoredMobileNotification = async ({
  target = "BUSINESS",
  businessId,
  title,
  message,
  category = "GENERAL",
  meta = {},
}: {
  target?: "ALL" | "BUSINESS";
  businessId?: number;
  title: string;
  message: string;
  category?: string;
  meta?: any;
}) => {
  const notification = await (prisma as any).mobileNotification.create({
    data: {
      target,
      businessId: target === "BUSINESS" ? businessId : null,
      title,
      message,
      category,
      meta,
    },
    include: { business: true },
  });
  void broadcastMobileNotification(notification);
  return notification;
};

export const registerMobilePushTokenService = async ({
  businessId,
  userId,
  token,
  platform,
  app = "tex_flutter_app",
}: {
  businessId: number;
  userId?: number;
  token: string;
  platform?: string;
  app?: string;
}) => {
  const cleanToken = token.trim();
  if (!cleanToken) throw new Error("PUSH_TOKEN_REQUIRED");

  return (prisma as any).mobilePushToken.upsert({
    where: { token: cleanToken },
    update: {
      businessId,
      userId,
      platform: platform || "android",
      app,
      isActive: true,
      lastSeenAt: new Date(),
    },
    create: {
      businessId,
      userId,
      token: cleanToken,
      platform: platform || "android",
      app,
      isActive: true,
      lastSeenAt: new Date(),
    },
  });
};

const ensurePlanConfigs = async () => {
  for (const plan of defaultPlanConfigs) {
    await (prisma as any).subscriptionPlanConfig.upsert({
      where: { id: plan.id },
      update: {},
      create: plan,
    });
  }
};

const broadcastPlanConfigUpdate = async () => {
  const plans = await getSubscriptionPlanConfigsService();
  void sendAdminRealtimeUpdate("ADMIN_DASHBOARD_UPDATED", {
    source: "content",
    eventType: "SUBSCRIPTION_PLANS_UPDATED",
    plans,
  });
  const businesses = await prisma.business.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  for (const business of businesses) {
    void sendRealtimeUpdate(business.id, "SUBSCRIPTION_PLANS_UPDATED", {
      businessId: business.id,
      plans,
    });
  }
  return plans;
};

export const getSubscriptionPlanConfigsService = async () => {
  await ensurePlanConfigs();
  const plans = await (prisma as any).subscriptionPlanConfig.findMany();
  const order = new Map(defaultPlanConfigs.map((plan, index) => [plan.id, index]));
  return plans
    .map((plan: any) => serializePlanConfig(plan))
    .sort((a: any, b: any) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
};

const resolvePayablePlan = async (business: any, planId: string) => {
  const normalizedPlanId = planId.trim().toLowerCase();
  const plans = await getSubscriptionPlanConfigsService();
  const plan = plans.find((item: any) => item.id === normalizedPlanId);
  if (!plan) throw new Error("PLAN_NOT_FOUND");
  if (Number(plan.amount ?? 0) <= 0) throw new Error("PLAN_NOT_PAYABLE");

  const activeStoredOffer = ((business.adminOffers as any[]) ?? []).find(
    (offer) =>
      offer.type === "PLAN_OFFER" &&
      offer.planId === normalizedPlanId &&
      isOfferActive(offer)
  );
  const fallbackOffer =
    !activeStoredOffer &&
    business.subscriptionOfferPlanId === normalizedPlanId
      ? fallbackActiveOffer(business)
      : null;
  const offerAmount =
    activeStoredOffer?.offerAmount == null
      ? fallbackOffer?.amount
      : Number(activeStoredOffer.offerAmount);
  const discountAmount =
    plan.discountAmount != null ? Number(plan.discountAmount) : null;
  const candidates = [
    Number(plan.amount ?? 0),
    ...(discountAmount != null ? [discountAmount] : []),
    ...(offerAmount != null ? [Number(offerAmount)] : []),
  ].filter((amount) => Number.isFinite(amount) && amount >= 0);
  const amount = Math.min(...candidates);

  return {
    id: plan.id,
    name: plan.name,
    amount,
    currency: plan.currency ?? "INR",
    catalogAmount: Number(plan.amount ?? 0),
    appliedOffer: offerAmount != null && amount === Number(offerAmount),
    appliedDiscount: discountAmount != null && amount === discountAmount,
  };
};

export const updateSubscriptionPlanPricesService = async (
  prices: Record<string, number>
) => {
  await ensurePlanConfigs();
  const editablePlanIds = ["clay", "metal", "steel"];
  for (const id of editablePlanIds) {
    const amount = Number(prices[id]);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error("INVALID_PLAN_PRICE");
    }
    await (prisma as any).subscriptionPlanConfig.update({
      where: { id },
      data: { amount },
    });
  }
  return broadcastPlanConfigUpdate();
};

export const getMobileNotificationsService = async () => {
  const notifications = await (prisma as any).mobileNotification.findMany({
    where: { deletedAt: null },
    include: { business: true },
    orderBy: { sentAt: "desc" },
  });
  return notifications.map(serializeMobileNotification);
};

export const createMobileNotificationService = async ({
  title,
  message,
}: {
  title: string;
  message: string;
}) => {
  const cleanMessage = message.trim();
  if (!cleanMessage) throw new Error("NOTIFICATION_MESSAGE_REQUIRED");
  const notification = await createStoredMobileNotification({
    target: "ALL",
    title: title.trim() || "teX notification",
    message: cleanMessage,
    category: "MANUAL",
  });
  return serializeMobileNotification(notification);
};

export const resendMobileNotificationService = async (id: number) => {
  const notification = await (prisma as any).mobileNotification.findFirst({
    where: { id, deletedAt: null },
    include: { business: true },
  });
  if (!notification) throw new Error("NOTIFICATION_NOT_FOUND");

  await (prisma as any).mobileNotification.update({
    where: { id },
    data: { sentAt: new Date() },
  });
  const updated = await (prisma as any).mobileNotification.findUnique({
    where: { id },
    include: { business: true },
  });
  void broadcastMobileNotification(updated);
  return serializeMobileNotification(updated);
};

export const deleteMobileNotificationService = async (id: number) => {
  const notification = await (prisma as any).mobileNotification.findFirst({
    where: { id, deletedAt: null },
  });
  if (!notification) throw new Error("NOTIFICATION_NOT_FOUND");
  await (prisma as any).mobileNotification.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};

export const getBusinessMobileNotificationsService = async (
  businessId: number
) => {
  const notifications = await (prisma as any).mobileNotification.findMany({
    where: {
      deletedAt: null,
      OR: [{ target: "ALL" }, { businessId }],
    },
    orderBy: { sentAt: "desc" },
  });
  return notifications.map(serializeMobileNotification);
};

export const updateSubscriptionPlanDiscountService = async ({
  name,
  validUntil,
  prices,
}: {
  name: string;
  validUntil: string;
  prices: Record<string, number>;
}) => {
  await ensurePlanConfigs();
  const discountName = name.trim();
  const endsAt = optionalDate(validUntil);
  if (!discountName) throw new Error("DISCOUNT_NAME_REQUIRED");
  if (!endsAt || endsAt.getTime() < Date.now()) {
    throw new Error("INVALID_DISCOUNT_DATE");
  }
  const editablePlanIds = ["clay", "metal", "steel"];
  for (const id of editablePlanIds) {
    const amount = Number(prices[id]);
    const plan = await (prisma as any).subscriptionPlanConfig.findUnique({
      where: { id },
    });
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error("INVALID_DISCOUNT_PRICE");
    }
    if (plan && amount >= Number(plan.amount ?? 0)) {
      throw new Error("DISCOUNT_MUST_BE_LOWER");
    }
    await (prisma as any).subscriptionPlanConfig.update({
      where: { id },
      data: {
        discountName,
        discountAmount: amount,
        discountEndsAt: endsAt,
      },
    });
  }
  const plans = await broadcastPlanConfigUpdate();
  void createStoredMobileNotification({
    target: "ALL",
    title: discountName,
    message: `${discountName} is live on all paid plans until ${endsAt.toLocaleDateString(
      "en-IN"
    )}. Open plans to check your discounted price.`,
    category: "PLAN_DISCOUNT",
    meta: { validUntil: endsAt, prices, plans },
  });
  return plans;
};

export const deleteSubscriptionPlanDiscountService = async () => {
  await ensurePlanConfigs();
  const editablePlanIds = ["clay", "metal", "steel"];
  for (const id of editablePlanIds) {
    await (prisma as any).subscriptionPlanConfig.update({
      where: { id },
      data: {
        discountName: null,
        discountAmount: null,
        discountEndsAt: null,
      },
    });
  }
  return broadcastPlanConfigUpdate();
};

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
  void createStoredMobileNotification({
    target: "BUSINESS",
    businessId: id,
    title: "Plan extended",
    message: `Your ${
      (business as any).subscriptionPlanName || "Flexit"
    } plan has been extended by ${days} day${days === 1 ? "" : "s"}.`,
    category: "PLAN_EXTENSION",
    meta: { extensionDays: days, planEndsAt: nextEnd },
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
  void createStoredMobileNotification({
    target: "BUSINESS",
    businessId: id,
    title: `${normalizedPlanName} offer`,
    message: `Special ${normalizedPlanName} plan offer: ₹${offerAmount} instead of ₹${originalAmount}. Valid until ${offerValidUntil.toLocaleDateString(
      "en-IN"
    )}.`,
    category: "PLAN_OFFER",
    meta: {
      planId: normalizedPlanId,
      planName: normalizedPlanName,
      originalAmount,
      offerAmount,
      validUntil: offerValidUntil,
    },
  });

  return serializeBusiness(updated);
};

export const createRazorpayPlanOrderService = async ({
  businessId,
  userId,
  planId,
}: RazorpayOrderInput) => {
  const business = await findBusinessWithOptionalAdminOffers(businessId);
  if (!business) throw new Error("BUSINESS_NOT_FOUND");

  const plan = await resolvePayablePlan(business, planId);
  const { keyId, client } = razorpayClient();
  const receipt = transactionCode("RZP", businessId).slice(0, 40);
  const order = await client.orders.create({
    amount: amountToPaise(plan.amount),
    currency: plan.currency,
    receipt,
    notes: {
      businessId: String(businessId),
      userId: userId == null ? "" : String(userId),
      planId: plan.id,
      planName: plan.name,
    },
  });

  return {
    keyId,
    orderId: order.id,
    amount: plan.amount,
    amountPaise: amountToPaise(plan.amount),
    currency: plan.currency,
    receipt,
    plan,
    business: {
      id: business.id,
      name: business.name,
      email: business.email,
      mobile: business.mobile,
    },
  };
};

export const createPaymentLinkTokenService = async ({
  businessId,
  userId,
  planId,
  role,
}: PaymentLinkTokenInput) => {
  const business = await findBusinessWithOptionalAdminOffers(businessId);
  if (!business) throw new Error("BUSINESS_NOT_FOUND");
  const plan = await resolvePayablePlan(business, planId);

  const token = jwt.sign(
    {
      purpose: "payment",
      userId,
      businessId,
      role,
      planId: plan.id,
    },
    paymentJwtSecret(),
    { expiresIn: "10m" }
  );

  return {
    token,
    planId: plan.id,
    expiresInSeconds: 600,
  };
};

export const verifyRazorpayPlanPaymentService = async ({
  businessId,
  userId,
  planId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}: RazorpayVerifyInput) => {
  const business = await findBusinessWithOptionalAdminOffers(businessId);
  if (!business) throw new Error("BUSINESS_NOT_FOUND");
  const plan = await resolvePayablePlan(business, planId);

  const signatureValid = verifyRazorpaySignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });
  if (!signatureValid) throw new Error("INVALID_RAZORPAY_SIGNATURE");

  const { client } = razorpayClient();
  const payment = await client.payments.fetch(razorpayPaymentId);
  if (
    String(payment.order_id) !== razorpayOrderId ||
    Number(payment.amount) !== amountToPaise(plan.amount) ||
    String(payment.status).toLowerCase() !== "captured"
  ) {
    throw new Error("RAZORPAY_PAYMENT_NOT_CAPTURED");
  }

  const existing = await (prisma as any).planTransaction.findUnique({
    where: { transactionId: razorpayPaymentId },
    include: { business: true },
  });
  if (existing) {
    return {
      business: serializeBusiness(business),
      transaction: serializePlanTransaction(existing),
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const savedBusiness = await tx.business.update({
      where: { id: businessId },
      data: {
        subscriptionPlanId: plan.id,
        subscriptionPlanName: plan.name,
        subscriptionStatus: "active",
        subscriptionAmount: plan.amount,
        subscriptionCurrency: plan.currency,
        subscriptionStartedAt: new Date(),
        subscriptionTrialEndsAt: null,
        subscriptionOfferPlanId: null,
        subscriptionOfferPlanName: null,
        subscriptionOfferOriginalAmount: null,
        subscriptionOfferAmount: null,
        subscriptionOfferExpiresAt: null,
        subscriptionOfferCreatedAt: null,
      } as any,
    });
    const transaction = await (tx as any).planTransaction.create({
      data: {
        transactionId: razorpayPaymentId,
        invoiceId: razorpayOrderId,
        amount: plan.amount,
        currency: plan.currency,
        status: "success",
        method: "razorpay",
        planId: plan.id,
        planName: plan.name,
        description: `${plan.name} plan payment via Razorpay`,
        customerId: userId,
        customerName: business.name,
        customerEmail: business.email,
        customerPhone: business.mobile,
        businessId,
        rawDetails: {
          razorpayOrderId,
          razorpayPaymentId,
          payment,
          plan,
        },
      },
      include: { business: true },
    });
    return { business: savedBusiness, transaction };
  });

  void broadcastBusinessDisplayConfigs(businessId);
  void sendAdminRealtimeUpdate("ADMIN_DASHBOARD_UPDATED", {
    source: "content",
    eventType: "BUSINESS_PLAN_PAYMENT_SUCCESS",
    businessId,
    planName: plan.name,
    amount: plan.amount,
  });
  void sendRealtimeUpdate(businessId, "BUSINESS_PLAN_PAYMENT_SUCCESS", {
    businessId,
    planId: plan.id,
    planName: plan.name,
    amount: plan.amount,
  });
  void createStoredMobileNotification({
    target: "BUSINESS",
    businessId,
    title: "Payment received",
    message: `Your ${plan.name} plan payment of INR ${plan.amount} was successful.`,
    category: "PLAN_PAYMENT",
    meta: {
      planId: plan.id,
      planName: plan.name,
      amount: plan.amount,
      transactionId: razorpayPaymentId,
    },
  });

  return {
    business: serializeBusiness(updated.business),
    transaction: serializePlanTransaction(updated.transaction),
  };
};

export const getBusinessPlanTransactionsService = async (businessId: number) => {
  const transactions = await (prisma as any).planTransaction.findMany({
    where: { businessId },
    include: { business: true },
    orderBy: { createdAt: "desc" },
  });
  return transactions.map(serializePlanTransaction);
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

