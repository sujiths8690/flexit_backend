import prisma from "../config/prisma";
import { getDeviceConfigByCodeService } from "../services/device/deviceRegistration.service";
import { sendDeviceRealtimeUpdate } from "./realtimeClient";

export const broadcastDeviceDisplayConfig = async (deviceCode: string) => {
  try {
    const config = await getDeviceConfigByCodeService(deviceCode);
    await sendDeviceRealtimeUpdate(deviceCode, "DEVICE_CONFIG_UPDATED", config);
  } catch (error) {
    console.error("Device display config broadcast failed:", error);
  }
};

export const broadcastBusinessDisplayConfigs = async (businessId: number) => {
  const devices = await prisma.device.findMany({
    where: { businessId, isActive: true },
    select: { deviceCode: true },
  });

  await Promise.all(
    devices.map((device) => broadcastDeviceDisplayConfig(device.deviceCode))
  );
};
