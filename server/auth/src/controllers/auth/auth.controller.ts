import { Request, Response } from "express";

import { linkBusinessService, LoginUser, registerService } from "../../services/auth/auth.services";
import { errorResponse, successResponse } from "../../utils/response.helper";
import { HTTP_STATUS } from "../../utils/httpStatus";

/* ================================
   REGISTER USER (WITH businessId)
================================ */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(
        res,
        "Email and password are required",
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const result = await registerService({
      email,
      password,
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

export const linkBusiness = async (req: Request, res: Response) => {
  try {
    console.log("🔥 LINK API HIT");
    console.log("USER:", req.user);
    console.log("BODY:", req.body);
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user.userId; 
    const { businessId } = req.body;

    if (!businessId) {
      return res.status(400).json({ error: "businessId required" });
    }

    const result= await linkBusinessService(userId, businessId);

    return res.json({
      success: true,
      message: "Business linked successfully",
      data: result
    });

  } catch (err) {
    return res.status(500).json({ error: "Failed to link business" });
  }
};