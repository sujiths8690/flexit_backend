import axios from "axios";

const REALTIME_URL = "http://localhost:3001/realtime/broadcast";

export const sendRealtimeUpdate = async (
  businessId: number,
  type: string,
  data: any
) => {
  try {
    await axios.post(REALTIME_URL, {
      businessId,
      type,
      data,
    });
  } catch (error) {
    console.error("Realtime service failed:", error);
  }
};