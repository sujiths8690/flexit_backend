import axios from "axios";

const REALTIME_URL = "http://realtime:3003/realtime/business-broadcast";
const DEVICE_REALTIME_URL = "http://realtime:3003/realtime/device-broadcast";
const DEVICE_STATUS_URL = "http://realtime:3003/realtime/device-status";
const DEVICE_STATUSES_URL = "http://realtime:3003/realtime/device-statuses";
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

const realtimeHeaders = (token?: string) =>
  process.env.REALTIME_INTERNAL_SECRET
    ? { "x-internal-realtime-secret": process.env.REALTIME_INTERNAL_SECRET }
    : token
      ? { Authorization: `Bearer ${token}` }
      : undefined;

export const getDeviceRealtimeStatus = async (
  deviceCode: string,
  token?: string
) => {
  try {
    const response = await axios.get(
      `${DEVICE_STATUS_URL}/${encodeURIComponent(deviceCode)}`,
      {
        headers: realtimeHeaders(token),
        timeout: REALTIME_TIMEOUT_MS,
      }
    );

    return Boolean(response.data?.data?.online);
  } catch (error) {
    console.error("Device realtime status failed:", error);
    return false;
  }
};

export const getDeviceRealtimeStatuses = async (
  deviceCodes: string[],
  token?: string
) => {
  const fallbackStatuses = deviceCodes.reduce<Record<string, boolean>>(
    (statuses, deviceCode) => {
      statuses[deviceCode.trim().toUpperCase()] = false;
      return statuses;
    },
    {}
  );

  try {
    const response = await axios.post(
      DEVICE_STATUSES_URL,
      { deviceCodes },
      {
        headers: realtimeHeaders(token),
        timeout: REALTIME_TIMEOUT_MS,
      }
    );

    const data = response.data?.data;
    if (!data || typeof data !== "object") return fallbackStatuses;

    return {
      ...fallbackStatuses,
      ...(data as Record<string, boolean>),
    };
  } catch (error) {
    console.error("Device realtime statuses failed:", error);
    return fallbackStatuses;
  }
};
