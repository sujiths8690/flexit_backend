import { Response } from "express";
import { HTTP_STATUS } from "./httpStatus";

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

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
  return res.status(statusCode).json({
    success: false,
    error,
  });
};

