// utils/activityClient.ts
import axios from "axios";

const ACTIVITY_URL = "http://localhost:3004/activity";

export const logActivity = async (
  userId: number,
  businessId: number,
  action: string,
  description?: string
) => {
  try {
    await axios.post(ACTIVITY_URL, {
      userId,
      businessId,
      action,
      description,
    });
  } catch (error) {
    console.error("Activity log failed:", error);
  }
};