import { Request, Response } from "express";
import { errorResponse, successResponse } from "../../utils/response.helper";
import { HTTP_STATUS } from "../../utils/httpStatus";
import {
  createComboOfferService,
  createNoticeService,
  createOfferService,
  deleteComboOfferService,
  deleteNoticeService,
  deleteOfferService,
  getComboOffersService,
  getMenuContentOverviewService,
  getMenuProductsService,
  getNoticesService,
  getOffersService,
  getTodaysStarService,
  setTodaysStarService,
  updateComboOfferService,
  updateNoticeService,
  updateOfferService,
} from "../../services/contentFeature/contentFeature.service";

const messageFor = (error: any) => error.message || "Request failed";
const bearerTokenFromRequest = (req: Request) =>
  req.headers.authorization?.split(" ")[1];

export const getMenuContentOverview = async (req: Request, res: Response) => {
  try {
    const content = await getMenuContentOverviewService(req.user!.businessId);
    return successResponse(
      res,
      content,
      "Menu content fetched",
      HTTP_STATUS.OK
    );
  } catch (error: any) {
    return errorResponse(
      res,
      messageFor(error),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};

export const getMenuProducts = async (req: Request, res: Response) => {
  try {
    const products = await getMenuProductsService(req.user!.businessId);
    return successResponse(res, products, "Products fetched", HTTP_STATUS.OK);
  } catch (error: any) {
    return errorResponse(
      res,
      messageFor(error),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};

export const getComboOffers = async (req: Request, res: Response) => {
  try {
    const combos = await getComboOffersService(req.user!.businessId);
    return successResponse(res, combos, "Combo offers fetched", HTTP_STATUS.OK);
  } catch (error: any) {
    return errorResponse(
      res,
      messageFor(error),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};

export const createComboOffer = async (req: Request, res: Response) => {
  try {
    const combo = await createComboOfferService({
      ...req.body,
      businessId: req.user!.businessId,
      token: bearerTokenFromRequest(req),
    });
    return successResponse(
      res,
      combo,
      "Combo offer created",
      HTTP_STATUS.CREATED
    );
  } catch (error: any) {
    return errorResponse(res, messageFor(error), HTTP_STATUS.BAD_REQUEST);
  }
};

export const updateComboOffer = async (req: Request, res: Response) => {
  try {
    const comboId = Number(req.params.comboId);
    if (Number.isNaN(comboId)) {
      return errorResponse(res, "Invalid combo id", HTTP_STATUS.BAD_REQUEST);
    }
    const combo = await updateComboOfferService({
      ...req.body,
      comboId,
      businessId: req.user!.businessId,
      token: bearerTokenFromRequest(req),
    });
    return successResponse(res, combo, "Combo offer updated", HTTP_STATUS.OK);
  } catch (error: any) {
    return errorResponse(res, messageFor(error), HTTP_STATUS.BAD_REQUEST);
  }
};

export const deleteComboOffer = async (req: Request, res: Response) => {
  try {
    const comboId = Number(req.params.comboId);
    if (Number.isNaN(comboId)) {
      return errorResponse(res, "Invalid combo id", HTTP_STATUS.BAD_REQUEST);
    }
    await deleteComboOfferService(
      req.user!.businessId,
      comboId,
      bearerTokenFromRequest(req)
    );
    return successResponse(res, null, "Combo offer deleted", HTTP_STATUS.OK);
  } catch (error: any) {
    return errorResponse(res, messageFor(error), HTTP_STATUS.BAD_REQUEST);
  }
};

export const getOffers = async (req: Request, res: Response) => {
  try {
    const offers = await getOffersService(req.user!.businessId);
    return successResponse(res, offers, "Offers fetched", HTTP_STATUS.OK);
  } catch (error: any) {
    return errorResponse(
      res,
      messageFor(error),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};

export const createOffer = async (req: Request, res: Response) => {
  try {
    const offer = await createOfferService({
      ...req.body,
      businessId: req.user!.businessId,
      token: bearerTokenFromRequest(req),
    });
    return successResponse(res, offer, "Offer created", HTTP_STATUS.CREATED);
  } catch (error: any) {
    return errorResponse(res, messageFor(error), HTTP_STATUS.BAD_REQUEST);
  }
};

export const updateOffer = async (req: Request, res: Response) => {
  try {
    const offerId = Number(req.params.offerId);
    if (Number.isNaN(offerId)) {
      return errorResponse(res, "Invalid offer id", HTTP_STATUS.BAD_REQUEST);
    }
    const offer = await updateOfferService({
      ...req.body,
      offerId,
      businessId: req.user!.businessId,
      token: bearerTokenFromRequest(req),
    });
    return successResponse(res, offer, "Offer updated", HTTP_STATUS.OK);
  } catch (error: any) {
    return errorResponse(res, messageFor(error), HTTP_STATUS.BAD_REQUEST);
  }
};

export const deleteOffer = async (req: Request, res: Response) => {
  try {
    const offerId = Number(req.params.offerId);
    if (Number.isNaN(offerId)) {
      return errorResponse(res, "Invalid offer id", HTTP_STATUS.BAD_REQUEST);
    }
    await deleteOfferService(
      req.user!.businessId,
      offerId,
      bearerTokenFromRequest(req)
    );
    return successResponse(res, null, "Offer deleted", HTTP_STATUS.OK);
  } catch (error: any) {
    return errorResponse(res, messageFor(error), HTTP_STATUS.BAD_REQUEST);
  }
};

export const getNotices = async (req: Request, res: Response) => {
  try {
    const notices = await getNoticesService(req.user!.businessId);
    return successResponse(res, notices, "Notices fetched", HTTP_STATUS.OK);
  } catch (error: any) {
    return errorResponse(
      res,
      messageFor(error),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};

export const createNotice = async (req: Request, res: Response) => {
  try {
    const notice = await createNoticeService({
      ...req.body,
      businessId: req.user!.businessId,
      token: bearerTokenFromRequest(req),
    });
    return successResponse(res, notice, "Notice created", HTTP_STATUS.CREATED);
  } catch (error: any) {
    return errorResponse(res, messageFor(error), HTTP_STATUS.BAD_REQUEST);
  }
};

export const updateNotice = async (req: Request, res: Response) => {
  try {
    const noticeId = Number(req.params.noticeId);
    if (Number.isNaN(noticeId)) {
      return errorResponse(res, "Invalid notice id", HTTP_STATUS.BAD_REQUEST);
    }
    const notice = await updateNoticeService({
      ...req.body,
      noticeId,
      businessId: req.user!.businessId,
      token: bearerTokenFromRequest(req),
    });
    return successResponse(res, notice, "Notice updated", HTTP_STATUS.OK);
  } catch (error: any) {
    return errorResponse(res, messageFor(error), HTTP_STATUS.BAD_REQUEST);
  }
};

export const deleteNotice = async (req: Request, res: Response) => {
  try {
    const noticeId = Number(req.params.noticeId);
    if (Number.isNaN(noticeId)) {
      return errorResponse(res, "Invalid notice id", HTTP_STATUS.BAD_REQUEST);
    }
    await deleteNoticeService(
      req.user!.businessId,
      noticeId,
      bearerTokenFromRequest(req)
    );
    return successResponse(res, null, "Notice deleted", HTTP_STATUS.OK);
  } catch (error: any) {
    return errorResponse(res, messageFor(error), HTTP_STATUS.BAD_REQUEST);
  }
};

export const getTodaysStar = async (req: Request, res: Response) => {
  try {
    const star = await getTodaysStarService(req.user!.businessId);
    return successResponse(res, star, "Today's star fetched", HTTP_STATUS.OK);
  } catch (error: any) {
    return errorResponse(
      res,
      messageFor(error),
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};

export const setTodaysStar = async (req: Request, res: Response) => {
  try {
    const productIds = Array.isArray(req.body.productIds)
      ? req.body.productIds.map((id: unknown) => Number(id))
      : [Number(req.body.productId)];
    if (
      !productIds.length ||
      productIds.some((id: number) => Number.isNaN(id))
    ) {
      return errorResponse(res, "Invalid product id", HTTP_STATUS.BAD_REQUEST);
    }
    const star = await setTodaysStarService(
      req.user!.businessId,
      productIds,
      bearerTokenFromRequest(req)
    );
    return successResponse(res, star, "Today's star saved", HTTP_STATUS.OK);
  } catch (error: any) {
    return errorResponse(res, messageFor(error), HTTP_STATUS.BAD_REQUEST);
  }
};
