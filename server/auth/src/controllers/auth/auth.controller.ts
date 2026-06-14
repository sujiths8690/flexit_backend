import { Request, Response } from "express";

import { isUsernameAvailableService, linkBusinessService, LoginUser, registerService } from "../../services/auth/auth.services";
import { errorResponse, successResponse } from "../../utils/response.helper";
import { HTTP_STATUS } from "../../utils/httpStatus";
import { sendDemoRequestEmail } from "../../services/mail/mail";

/* ================================
   REGISTER USER (WITH businessId)
================================ */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, username, firstName, lastName, password } = req.body;

    if (!email || !username || !firstName || !lastName || !password) {
      return errorResponse(
        res,
        "Email, username, first name, last name and password are required",
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const result = await registerService({
      email,
      username,
      firstName,
      lastName,
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

    if (err.message === "USERNAME_ALREADY_EXISTS") {
      return errorResponse(
        res,
        "Username already exists",
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
        "Email or username and password are required",
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

export const usernameAvailable = async (req: Request, res: Response) => {
  try {
    const username = String(req.query.username || "").trim();

    if (!username) {
      return errorResponse(
        res,
        "Username is required",
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const available = await isUsernameAvailableService(username);

    return successResponse(
      res,
      { available },
      available ? "Username is available" : "Username already exists",
      HTTP_STATUS.OK
    );
  } catch (err: any) {
    return errorResponse(
      res,
      err.message || "Username check failed",
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};

export const requestDemo = async (req: Request, res: Response) => {
  try {
    const businessName = String(req.body?.businessName || "").trim();
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const phone = String(req.body?.phone || "").trim();
    const tvScreens = String(req.body?.tvScreens || "").trim();
    const message = String(req.body?.message || "").trim();

    if (!businessName || !name || !email || !phone || !tvScreens) {
      return errorResponse(
        res,
        "Business name, name, email, phone and TV count are required",
        HTTP_STATUS.BAD_REQUEST
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse(res, "Enter a valid email address", HTTP_STATUS.BAD_REQUEST);
    }

    await sendDemoRequestEmail({
      businessName: businessName.slice(0, 120),
      name: name.slice(0, 120),
      email: email.slice(0, 160),
      phone: phone.slice(0, 40),
      tvScreens: tvScreens.slice(0, 40),
      message: message.slice(0, 2000),
    });

    return successResponse(
      res,
      null,
      "Demo request sent successfully",
      HTTP_STATUS.OK
    );
  } catch (err: any) {
    return errorResponse(
      res,
      err.message === "EMAIL_SERVICE_NOT_CONFIGURED"
        ? "Demo email service is not configured"
        : "Unable to send demo request right now",
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};
