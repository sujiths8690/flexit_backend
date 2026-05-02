import axios from "axios";

const REALTIME_URL = "http://realtime:3003/realtime/broadcast";

export const sendRealtimeUpdate = async (
  businessId: number,
  type: string,
  data: any,
  token?: string   // 🔥 add this
) => {
  try {
    await axios.post(
      REALTIME_URL,
      { businessId, type, data },
      {
        headers: {
          Authorization: `Bearer ${token}`, // ✅
        },
      }
    );
  } catch (error) {
    console.error("Realtime service failed:", error);
  }
};