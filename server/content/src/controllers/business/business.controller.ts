import { Request, Response } from "express";
import {
  createBusinessService,
  updateBusinessService,
  getBusinessByIdService,
  disableBusinessService,
  enableBusinessService,
  getAdminRevenueOverviewService,
  extendBusinessPlanService,
  setBusinessPlanOfferService,
  getSubscriptionPlanConfigsService,
  updateSubscriptionPlanPricesService,
  updateSubscriptionPlanDiscountService,
  createMobileNotificationService,
  deleteMobileNotificationService,
  getBusinessMobileNotificationsService,
  getMobileNotificationsService,
  registerMobilePushTokenService,
  resendMobileNotificationService
} from "../../services/business/business.services";

import { successResponse, errorResponse } from "../../utils/response.helper";
import { HTTP_STATUS } from "../../utils/httpStatus";

/* ================================
   CREATE BUSINESS
================================ */
export const createBusinessController = async (req: Request, res: Response) => {
  try {
    const {
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
      customer
    } = req.body;

    const business = await createBusinessService({
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
      customer
    });

    return successResponse(
      res,
      business,
      "Business created successfully",
      HTTP_STATUS.CREATED
    );

  } catch (error: any) {
    return errorResponse(
      res,
      error.message,
      HTTP_STATUS.BAD_REQUEST
    );
  }
};


/* ================================
   GET BUSINESS BY ID
================================ */
export const getBusinessByIdController = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const business = await getBusinessByIdService(id);

    return successResponse(
      res,
      business,
      "Business fetched successfully",
      HTTP_STATUS.OK
    );

  } catch (error: any) {
    return errorResponse(
      res,
      error.message,
      HTTP_STATUS.NOT_FOUND
    );
  }
};


/* ================================
   UPDATE BUSINESS
================================ */
export const updateBusinessController = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const {
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
      showComboItemQuantity
    } = req.body;

    const business = await updateBusinessService({
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
      showComboItemQuantity
    });

    return successResponse(
      res,
      business,
      "Business updated successfully",
      HTTP_STATUS.OK
    );

  } catch (error: any) {
    return errorResponse(
      res,
      error.message,
      HTTP_STATUS.BAD_REQUEST
    );
  }
};


/* ================================
   DISABLE BUSINESS
================================ */
export const disableBusinessController = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const business = await disableBusinessService(id);

    return successResponse(
      res,
      business,
      "Business disabled successfully",
      HTTP_STATUS.OK
    );

  } catch (error: any) {
    return errorResponse(
      res,
      error.message,
      HTTP_STATUS.BAD_REQUEST
    );
  }
};


/* ================================
   ENABLE BUSINESS
================================ */
export const enableBusinessController = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const business = await enableBusinessService(id);

    return successResponse(
      res,
      business,
      "Business enabled successfully",
      HTTP_STATUS.OK
    );

  } catch (error: any) {
    return errorResponse(
      res,
      error.message,
      HTTP_STATUS.BAD_REQUEST
    );
  }
};

export const extendBusinessPlanController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    const days = Number(req.body.days);

    const business = await extendBusinessPlanService({ id, days });

    return successResponse(
      res,
      business,
      "Business plan extended successfully",
      HTTP_STATUS.OK
    );
  } catch (error: any) {
    const messages: Record<string, string> = {
      BUSINESS_NOT_FOUND: "Business not found",
      INVALID_EXTENSION_DAYS: "Choose between 1 and 30 days",
    };
    return errorResponse(
      res,
      messages[error.message] || error.message,
      HTTP_STATUS.BAD_REQUEST
    );
  }
};

export const setBusinessPlanOfferController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    const { planId, planName, originalAmount, offerAmount, validUntil } = req.body;

    const business = await setBusinessPlanOfferService({
      id,
      planId: String(planId || ""),
      planName: String(planName || ""),
      originalAmount: Number(originalAmount),
      offerAmount: Number(offerAmount),
      validUntil: String(validUntil || ""),
    });

    return successResponse(
      res,
      business,
      "Business plan offer saved successfully",
      HTTP_STATUS.OK
    );
  } catch (error: any) {
    const messages: Record<string, string> = {
      BUSINESS_NOT_FOUND: "Business not found",
      PLAN_REQUIRED: "Choose a plan",
      INVALID_PLAN_AMOUNT: "Invalid plan amount",
      INVALID_OFFER_AMOUNT: "Offer amount must be lower than the plan price",
      INVALID_OFFER_EXPIRY: "Choose a valid future offer end date",
    };
    return errorResponse(
      res,
      messages[error.message] || error.message,
      HTTP_STATUS.BAD_REQUEST
    );
  }
};

export const getSubscriptionPlanConfigsController = async (
  req: Request,
  res: Response
) => {
  try {
    const plans = await getSubscriptionPlanConfigsService();
    return successResponse(res, { plans }, "Plans fetched successfully", HTTP_STATUS.OK);
  } catch (error: any) {
    return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

export const updateSubscriptionPlanPricesController = async (
  req: Request,
  res: Response
) => {
  try {
    const plans = await updateSubscriptionPlanPricesService(req.body?.prices ?? {});
    return successResponse(res, { plans }, "Plan prices updated successfully", HTTP_STATUS.OK);
  } catch (error: any) {
    const messages: Record<string, string> = {
      INVALID_PLAN_PRICE: "Enter a valid price for every plan",
    };
    return errorResponse(
      res,
      messages[error.message] || error.message,
      HTTP_STATUS.BAD_REQUEST
    );
  }
};

export const updateSubscriptionPlanDiscountController = async (
  req: Request,
  res: Response
) => {
  try {
    const plans = await updateSubscriptionPlanDiscountService({
      name: String(req.body?.name ?? ""),
      validUntil: String(req.body?.validUntil ?? ""),
      prices: req.body?.prices ?? {},
    });
    return successResponse(res, { plans }, "Plan discount saved successfully", HTTP_STATUS.OK);
  } catch (error: any) {
    const messages: Record<string, string> = {
      DISCOUNT_NAME_REQUIRED: "Enter a discount name",
      INVALID_DISCOUNT_DATE: "Choose a valid future discount date",
      INVALID_DISCOUNT_PRICE: "Enter a valid discount price for every plan",
      DISCOUNT_MUST_BE_LOWER: "Discount prices must be lower than plan prices",
    };
    return errorResponse(
      res,
      messages[error.message] || error.message,
      HTTP_STATUS.BAD_REQUEST
    );
  }
};

export const getMobileNotificationsController = async (
  req: Request,
  res: Response
) => {
  try {
    const notifications = await getMobileNotificationsService();
    return successResponse(
      res,
      { notifications },
      "Notifications fetched successfully",
      HTTP_STATUS.OK
    );
  } catch (error: any) {
    return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

export const createMobileNotificationController = async (
  req: Request,
  res: Response
) => {
  try {
    const notification = await createMobileNotificationService({
      title: String(req.body?.title ?? ""),
      message: String(req.body?.message ?? ""),
    });
    return successResponse(
      res,
      { notification },
      "Notification sent successfully",
      HTTP_STATUS.CREATED
    );
  } catch (error: any) {
    const messages: Record<string, string> = {
      NOTIFICATION_MESSAGE_REQUIRED: "Enter a notification message",
    };
    return errorResponse(
      res,
      messages[error.message] || error.message,
      HTTP_STATUS.BAD_REQUEST
    );
  }
};

export const resendMobileNotificationController = async (
  req: Request,
  res: Response
) => {
  try {
    const notification = await resendMobileNotificationService(
      Number(req.params.id)
    );
    return successResponse(
      res,
      { notification },
      "Notification resent successfully",
      HTTP_STATUS.OK
    );
  } catch (error: any) {
    const messages: Record<string, string> = {
      NOTIFICATION_NOT_FOUND: "Notification not found",
    };
    return errorResponse(
      res,
      messages[error.message] || error.message,
      HTTP_STATUS.BAD_REQUEST
    );
  }
};

export const deleteMobileNotificationController = async (
  req: Request,
  res: Response
) => {
  try {
    await deleteMobileNotificationService(Number(req.params.id));
    return successResponse(
      res,
      null,
      "Notification deleted successfully",
      HTTP_STATUS.OK
    );
  } catch (error: any) {
    const messages: Record<string, string> = {
      NOTIFICATION_NOT_FOUND: "Notification not found",
    };
    return errorResponse(
      res,
      messages[error.message] || error.message,
      HTTP_STATUS.BAD_REQUEST
    );
  }
};

export const getMyMobileNotificationsController = async (
  req: Request,
  res: Response
) => {
  try {
    const notifications = await getBusinessMobileNotificationsService(
      req.user!.businessId
    );
    return successResponse(
      res,
      { notifications },
      "Notifications fetched successfully",
      HTTP_STATUS.OK
    );
  } catch (error: any) {
    return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

export const registerMobilePushTokenController = async (
  req: Request,
  res: Response
) => {
  try {
    await registerMobilePushTokenService({
      businessId: req.user!.businessId,
      userId: req.user!.userId,
      token: String(req.body?.token ?? ""),
      platform: String(req.body?.platform ?? "android"),
      app: String(req.body?.app ?? "tex_flutter_app"),
    });

    return successResponse(
      res,
      null,
      "Push token registered successfully",
      HTTP_STATUS.OK
    );
  } catch (error: any) {
    const messages: Record<string, string> = {
      PUSH_TOKEN_REQUIRED: "Push token is required",
    };
    return errorResponse(
      res,
      messages[error.message] || error.message,
      HTTP_STATUS.BAD_REQUEST
    );
  }
};

/* ================================
   ADMIN REVENUE + TRANSACTIONS
================================ */
export const getAdminRevenueOverviewController = async (
  req: Request,
  res: Response
) => {
  try {
    const overview = await getAdminRevenueOverviewService();

    return successResponse(
      res,
      overview,
      "Revenue fetched successfully",
      HTTP_STATUS.OK
    );
  } catch (error: any) {
    return errorResponse(
      res,
      error.message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};
