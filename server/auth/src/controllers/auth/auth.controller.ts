import { Request, Response } from "express";

import { LoginUser, registerService } from "../../services/auth/auth.services";
import { errorResponse, successResponse } from "../../utils/response.helper";
import { HTTP_STATUS } from "../../utils/httpStatus";

/* ================================
   REGISTER USER (WITH businessId)
================================ */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, businessId } = req.body;

    if (!email || !password || !businessId) {
      return errorResponse(
        res,
        "email, password and businessId are required",
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const result = await registerService({
      email,
      password,
      businessId,
    });

    return successResponse(
      res,
      result,
      "User registered successfully",
      HTTP_STATUS.CREATED
    );

  } catch (err: any) {

    if (err.message === "EMAIL_ALREADY_EXISTS") {
      return errorResponse(
        res,
        "Email already exists",
        HTTP_STATUS.CONFLICT
      );
    }

    return errorResponse(
      res,
      `Registration failed: ${err.message}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};


/* ================================
   LOGIN
================================ */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(
        res,
        "Email and password are required",
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const result = await LoginUser(email, password);

    return successResponse(
      res,
      result,
      "Login successful",
      HTTP_STATUS.OK
    );

  } catch (err: any) {

    return errorResponse(
      res,
      err.message || "Login failed",
      HTTP_STATUS.UNAUTHORIZED
    );
  }
};