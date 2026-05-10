import axios from "axios";

const REALTIME_URL = "http://realtime:3003/realtime/business-broadcast";
const DEVICE_REALTIME_URL = "http://realtime:3003/realtime/device-broadcast";
const REALTIME_TIMEOUT_MS = 1000;

export const sendRealtimeUpdate = async (
  businessId: number,
  type: string,
  data: any,
  token?: string
) => {
  try {
    await axios.post(
      REALTIME_URL,
      { businessId, type, data },
      {
        headers: process.env.REALTIME_INTERNAL_SECRET
          ? { "x-internal-realtime-secret": process.env.REALTIME_INTERNAL_SECRET }
          : token
            ? { Authorization: `Bearer ${token}` }
            : undefined,
        timeout: REALTIME_TIMEOUT_MS,
      }
    );
  } catch (error) {
    console.error("Realtime service failed:", error);
  }
};

export const sendDeviceRealtimeUpdate = async (
  deviceCode: string,
  type: string,
  data: any
) => {
  try {
    await axios.post(
      DEVICE_REALTIME_URL,
      { deviceCode, type, data },
      {
        headers: process.env.REALTIME_INTERNAL_SECRET
          ? { "x-internal-realtime-secret": process.env.REALTIME_INTERNAL_SECRET }
          : undefined,
        timeout: REALTIME_TIMEOUT_MS,
      }
    );
  } catch (error) {
    console.error("Device realtime service failed:", error);
  }
};
