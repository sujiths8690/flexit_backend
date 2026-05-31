import { Request, Response } from "express";
import {
  blockAdmin,
  changeAdminPassword,
  createAdmin,
  deleteAdmin,
  getAdminById,
  listAdmins,
  loginAdmin,
  unblockAdmin,
  updateAdmin,
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
    const {
      name,
      firstName,
      lastName,
      mobile,
      age,
      address,
      email,
      password
    } = req.body;
    const admin = await createAdmin({
      name: name === undefined ? undefined : String(name),
      firstName: firstName === undefined ? undefined : String(firstName),
      lastName: lastName === undefined ? undefined : String(lastName),
      mobile: mobile === undefined ? undefined : String(mobile),
      age: age === undefined || age === "" ? undefined : Number(age),
      address: address === undefined ? undefined : String(address),
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
      INVALID_AGE: "Enter a valid age",
      EMAIL_ALREADY_EXISTS: "An admin with this email already exists",
    };
    return errorResponse(
      res,
      messageMap[err.message] || "Admin creation failed",
      400
    );
  }
};

export const show = async (req: Request, res: Response) => {
  try {
    const admin = await getAdminById(Number(req.params.id), true);
    return successResponse(res, { admin }, "Admin loaded");
  } catch {
    return errorResponse(res, "Admin not found", 404);
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    if (!req.admin) return errorResponse(res, "Unauthorized", 401);
    const { name, firstName, lastName, mobile, age, address, email } = req.body;
    const admin = await updateAdmin(Number(req.params.id), req.admin.adminId, {
      name: name === undefined ? undefined : String(name),
      firstName: firstName === undefined ? undefined : String(firstName),
      lastName: lastName === undefined ? undefined : String(lastName),
      mobile: mobile === undefined ? undefined : String(mobile),
      age: age === undefined || age === "" ? undefined : Number(age),
      address: address === undefined ? undefined : String(address),
      email: email === undefined ? undefined : String(email),
    });
    return successResponse(res, { admin }, "Admin updated");
  } catch (err: any) {
    const messageMap: Record<string, string> = {
      ADMIN_NOT_FOUND: "Admin not found",
      CANNOT_MODIFY_SELF: "You cannot modify your own admin account",
      CANNOT_MODIFY_SUPERADMIN: "Superadmin accounts cannot be modified here",
      NAME_REQUIRED: "Admin name is required",
      INVALID_EMAIL: "Enter a valid admin email",
      INVALID_AGE: "Enter a valid age",
      EMAIL_ALREADY_EXISTS: "An admin with this email already exists",
    };
    return errorResponse(
      res,
      messageMap[err.message] || "Admin update failed",
      400
    );
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    if (!req.admin) return errorResponse(res, "Unauthorized", 401);
    const { password } = req.body;
    const admin = await changeAdminPassword(
      Number(req.params.id),
      req.admin.adminId,
      String(password || "")
    );
    return successResponse(res, { admin }, "Admin password updated");
  } catch (err: any) {
    const messageMap: Record<string, string> = {
      ADMIN_NOT_FOUND: "Admin not found",
      CANNOT_MODIFY_SELF: "You cannot modify your own admin account",
      CANNOT_MODIFY_SUPERADMIN: "Superadmin accounts cannot be modified here",
      WEAK_PASSWORD: "Password must be at least 8 characters",
    };
    return errorResponse(
      res,
      messageMap[err.message] || "Password update failed",
      400
    );
  }
};

const adminActionError = (res: Response, message: string) => {
  const messageMap: Record<string, string> = {
    ADMIN_NOT_FOUND: "Admin not found",
    CANNOT_MODIFY_SELF: "You cannot modify your own admin account",
    CANNOT_MODIFY_SUPERADMIN: "Superadmin accounts cannot be modified here",
  };
  return errorResponse(res, messageMap[message] || "Admin action failed", 400);
};

export const block = async (req: Request, res: Response) => {
  try {
    if (!req.admin) return errorResponse(res, "Unauthorized", 401);
    const admin = await blockAdmin(Number(req.params.id), req.admin.adminId);
    return successResponse(res, { admin }, "Admin blocked");
  } catch (err: any) {
    return adminActionError(res, err.message);
  }
};

export const unblock = async (req: Request, res: Response) => {
  try {
    if (!req.admin) return errorResponse(res, "Unauthorized", 401);
    const admin = await unblockAdmin(Number(req.params.id), req.admin.adminId);
    return successResponse(res, { admin }, "Admin unblocked");
  } catch (err: any) {
    return adminActionError(res, err.message);
  }
};

export const destroy = async (req: Request, res: Response) => {
  try {
    if (!req.admin) return errorResponse(res, "Unauthorized", 401);
    await deleteAdmin(Number(req.params.id), req.admin.adminId);
    return successResponse(res, {}, "Admin deleted");
  } catch (err: any) {
    return adminActionError(res, err.message);
  }
};
