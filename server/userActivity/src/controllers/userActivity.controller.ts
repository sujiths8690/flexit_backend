// src/controllers/userActivity.controller.ts
import { Request, Response } from "express";
import { logUserActivity } from "../services/userActivity.services";

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