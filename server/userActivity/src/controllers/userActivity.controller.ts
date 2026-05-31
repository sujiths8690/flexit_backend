// src/controllers/userActivity.controller.ts
import { Request, Response } from "express";
import { deleteAppErrorByErrorId, listAppErrors, listUserActivities, logAppError, logUserActivity } from "../services/userActivity.services";

export const createActivity = async (req: Request, res: Response) => {
  try {
    const { userId, businessId, action, description } = req.body;

    const activity = await logUserActivity({
      userId,
      businessId,
      action,
      description,
    });

    res.status(201).json({
      success: true,
      data: activity,
    });

  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

export const getActivities = async (_req: Request, res: Response) => {
  try {
    const activities = await listUserActivities();
    res.status(200).json({ success: true, data: { activities } });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const createAppError = async (req: Request, res: Response) => {
  try {
    const error = await logAppError(req.body);
    res.status(201).json({ success: true, data: error });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getAppErrors = async (_req: Request, res: Response) => {
  try {
    const errors = await listAppErrors();
    res.status(200).json({ success: true, data: { errors } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteAppError = async (req: Request, res: Response) => {
  try {
    const errorId = String(req.params.errorId || "");
    if (!errorId) {
      return res.status(400).json({ success: false, error: "errorId required" });
    }
    await deleteAppErrorByErrorId(errorId);
    res.status(200).json({ success: true, data: { errorId } });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
};
