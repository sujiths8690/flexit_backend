import { Request, Response } from "express";
import {
  createBusinessService,
  updateBusinessService,
  getBusinessByIdService,
  disableBusinessService,
  enableBusinessService
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
      showProductImage
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
      showProductImage
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
      showProductImage
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
      showProductImage
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
