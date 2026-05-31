import { Response } from "express";
import { HTTP_STATUS } from "./httpStatus";

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

const reportError = (res: Response, error: string, statusCode: number) => {
  const req = res.req as any;
  const url = process.env.ERROR_REPORT_URL || "http://user-activity:3004/api/user-activity/errors";
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "teXBoard-auth",
      errorType: "backend",
      severity: statusCode >= 500 ? "critical" : "medium",
      status: "open",
      message: error,
      errorCode: error.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 60).toUpperCase(),
      businessId: req?.user?.businessId,
      ownerId: req?.user?.userId?.toString(),
      environment: {
        method: req?.method,
        url: req?.originalUrl,
        statusCode,
      },
    }),
  }).catch(() => undefined);
};

export const successResponse = (
  res: Response,
  data: any,
  message = "Success",
  statusCode: number = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};


export const errorResponse = (
  res: Response,
  error: string,
  statusCode: number = HTTP_STATUS.BAD_REQUEST
) => {
  reportError(res, error, statusCode);
  return res.status(statusCode).json({
    success: false,
    error,
  });
};

