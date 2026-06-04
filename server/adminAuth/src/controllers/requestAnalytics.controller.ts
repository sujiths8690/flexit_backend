import { Request, Response } from "express";
import { getRequestAnalytics } from "../services/requestAnalytics.service";
import { errorResponse, successResponse } from "../utils/response";

export const requestAnalytics = async (_req: Request, res: Response) => {
  try {
    const analytics = await getRequestAnalytics();
    return successResponse(res, analytics, "Request analytics loaded");
  } catch {
    return errorResponse(res, "Request analytics unavailable", 503);
  }
};
