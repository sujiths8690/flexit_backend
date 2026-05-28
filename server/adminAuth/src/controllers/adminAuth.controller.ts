import { Request, Response } from "express";
import {
  createAdmin,
  getAdminById,
  listAdmins,
  loginAdmin,
} from "../services/adminAuth.service";
import { errorResponse, successResponse } from "../utils/response";

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return errorResponse(res, "Email and password are required", 400);
    }

    const result = await loginAdmin(String(email), String(password));
    return successResponse(res, result, "Login successful");
  } catch {
    return errorResponse(res, "Invalid admin credentials", 401);
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    if (!req.admin) return errorResponse(res, "Unauthorized", 401);
    const admin = await getAdminById(req.admin.adminId);
    return successResponse(res, { admin }, "Profile loaded");
  } catch {
    return errorResponse(res, "Admin not found", 404);
  }
};

export const index = async (_req: Request, res: Response) => {
  const admins = await listAdmins();
  return successResponse(res, { admins }, "Admins loaded");
};

export const store = async (req: Request, res: Response) => {
  try {
    if (!req.admin) return errorResponse(res, "Unauthorized", 401);
    const { name, email, password } = req.body;
    const admin = await createAdmin({
      name: String(name || ""),
      email: String(email || ""),
      password: String(password || ""),
      createdById: req.admin.adminId,
    });
    return successResponse(res, { admin }, "Admin created", 201);
  } catch (err: any) {
    const messageMap: Record<string, string> = {
      NAME_REQUIRED: "Admin name is required",
      INVALID_EMAIL: "Enter a valid admin email",
      WEAK_PASSWORD: "Password must be at least 8 characters",
      EMAIL_ALREADY_EXISTS: "An admin with this email already exists",
    };
    return errorResponse(
      res,
      messageMap[err.message] || "Admin creation failed",
      400
    );
  }
};
