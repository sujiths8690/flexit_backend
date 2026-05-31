import { Response } from "express";

const reportError = (res: Response, error: string, statusCode: number) => {
  const req = res.req as any;
  const url = process.env.ERROR_REPORT_URL || "http://user-activity:3004/api/user-activity/errors";
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "teXBoard-adminAuth",
      errorType: "backend",
      severity: statusCode >= 500 ? "critical" : "medium",
      status: "open",
      message: error,
      errorCode: error.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 60).toUpperCase(),
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
  data: unknown,
  message = "Success",
  statusCode = 200
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
  statusCode = 400
) => {
  reportError(res, error, statusCode);
  return res.status(statusCode).json({
    success: false,
    error,
  });
};
