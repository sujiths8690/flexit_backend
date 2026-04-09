import prisma from "../../config/prisma";
import { logActivity } from "../../utils/activityClient";
import { sendRealtimeUpdate } from "../../utils/realtimeClient";

interface DeviceInput {
    deviceId?: number;
    name?: string;
    businessId: number;
    userId: number;
}

/* ================================
   REGISTER DEVICE
================================ */
const registerDeviceService = async ({
    name,
    businessId,
    userId
}: DeviceInput) => {

    try {

        // 1. Check business exists
        const business = await prisma.business.findUnique({
            where: { id: businessId }
        });

        if (!business) {
            throw new Error("BUSINESS_NOT_FOUND");
        }

        // 2. Generate unique deviceCode
        const deviceCode = "DEV-" + Math.random().toString(36).substring(2, 10);

        // 3. Create device
        const device = await prisma.device.create({
            data: {
                name,
                businessId,
                deviceCode
            }
        });


        logActivity(
            userId,
            businessId,
            "CREATED_DEVICE",
            `Registered device ${device.name || "Unnamed"} with code ${device.deviceCode}`
        )

        // 5. WebSocket broadcast (optional)
        sendRealtimeUpdate(
            businessId,
            "DEVICE_CREATED",
            device.deviceCode
        );

        return {
            id: device.id,
            name: device.name,
            deviceCode: device.deviceCode
        };

    } catch (error: any) {
        throw new Error(`ERROR_CREATING_DEVICE: ${error.message}`);
    }
};


/* ================================
   DELETE DEVICE
================================ */
const deleteDeviceService = async (
    deviceId: number,
    businessId: number,
    userId: number
) => {

    try {

        if (!deviceId) {
            throw new Error("DEVICE_ID_REQUIRED");
        }

        // 1. Check device exists
        const existingDevice = await prisma.device.findFirst({
            where: {
                id: deviceId,
                businessId
            }
        });

        if (!existingDevice) {
            throw new Error("DEVICE_NOT_FOUND");
        }

        // 2. Delete device
        await prisma.device.delete({
            where: { id: deviceId }
        });

        logActivity(
            userId,
            businessId,
            "DELETED_DEVICE",
            `Deleted device ${existingDevice.name || "Unnamed"}`
        );

        sendRealtimeUpdate(
            businessId,
            "DEVICE_DELETED",
            {id: deviceId}
        );

        return { success: true };

    } catch (error: any) {
        throw new Error(`ERROR_DELETING_DEVICE: ${error.message}`);
    }
};


export {
    registerDeviceService,
    deleteDeviceService
};