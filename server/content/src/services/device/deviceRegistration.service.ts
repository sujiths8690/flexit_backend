import prisma from "../../config/prisma";
import { logActivity } from "../../utils/activityClient";
import { sendRealtimeUpdate } from "../../utils/realtimeClient";

interface DeviceInput {
    deviceId?: number;
    name?: string;
    deviceCode?: string;
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
   PAIR DEVICE BY DISPLAY CODE
================================ */
const pairDeviceByCodeService = async ({
    deviceCode,
    name,
    businessId,
    userId
}: DeviceInput) => {

    try {

        if (!deviceCode) {
            throw new Error("DEVICE_CODE_REQUIRED");
        }

        const normalizedCode = deviceCode.trim().toUpperCase();

        const business = await prisma.business.findUnique({
            where: { id: businessId }
        });

        if (!business) {
            throw new Error("BUSINESS_NOT_FOUND");
        }

        const existingDevice = await prisma.device.findUnique({
            where: { deviceCode: normalizedCode }
        });

        if (existingDevice && existingDevice.businessId !== businessId) {
            throw new Error("DEVICE_ALREADY_PAIRED");
        }

        const device = existingDevice
            ? await prisma.device.update({
                where: { id: existingDevice.id },
                data: {
                    name: name?.trim() || existingDevice.name || `Display ${normalizedCode.slice(0, 4)}`
                }
            })
            : await prisma.device.create({
                data: {
                    name: name?.trim() || `Display ${normalizedCode.slice(0, 4)}`,
                    businessId,
                    deviceCode: normalizedCode
                }
            });

        logActivity(
            userId,
            businessId,
            "PAIRED_DEVICE",
            `Paired display device with code ${device.deviceCode}`
        );

        sendRealtimeUpdate(
            businessId,
            "DEVICE_PAIRED",
            device.deviceCode
        );

        return {
            id: device.id,
            name: device.name,
            deviceCode: device.deviceCode,
            mode: device.displayMode,
            online: true
        };

    } catch (error: any) {
        throw new Error(`ERROR_PAIRING_DEVICE: ${error.message}`);
    }
};

/* ================================
   LIST DEVICES FOR BUSINESS
================================ */
const listDevicesByBusinessService = async (businessId: number) => {

    try {

        const devices = await prisma.device.findMany({
            where: {
                businessId,
                isActive: true
            },
            orderBy: { createdAt: "desc" }
        });

        return devices.map((device) => ({
            id: device.id,
            name: device.name,
            deviceCode: device.deviceCode,
            mode: device.displayMode,
            online: true
        }));

    } catch (error: any) {
        throw new Error(`ERROR_FETCHING_DEVICES: ${error.message}`);
    }
};


/* ================================
   PUBLIC DISPLAY CONFIG LOOKUP
================================ */
const getDeviceConfigByCodeService = async (deviceCode: string) => {

    try {

        if (!deviceCode) {
            throw new Error("DEVICE_CODE_REQUIRED");
        }

        const normalizedCode = deviceCode.trim().toUpperCase();

        const device = await prisma.device.findUnique({
            where: { deviceCode: normalizedCode },
            include: { business: true }
        });

        if (!device) {
            return {
                deviceCode: normalizedCode,
                isPaired: false,
                orientation: "landscape",
                displayConfig: null
            };
        }

        return {
            deviceCode: device.deviceCode,
            isPaired: true,
            businessName: device.business.name,
            businessLogoUrl: null,
            orientation: "landscape",
            displayConfig: {
                mode: "menuBoard",
                menuCategory: "all",
                autoScrollIntervalSeconds: 8
            }
        };

    } catch (error: any) {
        throw new Error(`ERROR_FETCHING_DEVICE_CONFIG: ${error.message}`);
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
    pairDeviceByCodeService,
    listDevicesByBusinessService,
    getDeviceConfigByCodeService,
    deleteDeviceService
};
