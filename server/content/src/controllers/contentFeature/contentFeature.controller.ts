import { Request, Response } from "express";
import { errorResponse, successResponse } from "../../utils/response.helper";
import { HTTP_STATUS } from "../../utils/httpStatus";
import {
  createComboOfferService,
  deleteComboOfferService,
  getComboOffersService,
  getMenuProductsService,
  getTodaysStarService,
  setTodaysStarService,
  updateComboOfferService,
} from "../../services/contentFeature/contentFeature.service";

const messageFor = (error: any) => error.message || "Request failed";

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
    await deleteComboOfferService(req.user!.businessId, comboId);
    return successResponse(res, null, "Combo offer deleted", HTTP_STATUS.OK);
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
    const star = await setTodaysStarService(req.user!.businessId, productIds);
    return successResponse(res, star, "Today's star saved", HTTP_STATUS.OK);
  } catch (error: any) {
    return errorResponse(res, messageFor(error), HTTP_STATUS.BAD_REQUEST);
  }
};
