
import prisma from "../../config/prisma";
import { logActivity } from "../../utils/activityClient";
import { sendRealtimeUpdate } from "../../utils/realtimeClient";


interface CreateDeviceMediaInput {
    deviceId: number;
    mediaId: number;
    position?: number;
    businessId: number;
    userId: number;
}

interface UpdateDeviceMediaInput {
    deviceMediaId: number;
    position?: number;
    businessId: number;
    userId: number;
}

interface DeleteDeviceMediaInput {
    deviceMediaId: number;
    businessId: number;
    userId: number;
}

/* ================================
   CREATE DEVICE MEDIA
================================ */
const createDeviceMediaService = async ({
    deviceId,
    mediaId,
    position = 0,
    businessId,
    userId
}: CreateDeviceMediaInput) => {

    try {

        const device = await prisma.device.findFirst({
            where: { id: deviceId, businessId }
        });

        if (!device) {
            throw new Error("DEVICE_NOT_FOUND");
        }

        const media = await prisma.media.findFirst({
            where: { id: mediaId, businessId }
        });

        if (!media) {
            throw new Error("MEDIA_NOT_FOUND");
        }

        const deviceMedia = await prisma.deviceMedia.create({
            data: {
                deviceId,
                mediaId: mediaId!,
                position
            }
        });

        // await prisma.userActivity.create({
        //     data: {
        //         businessId,
        //         userId,
        //         userActivityType: "CREATED_DEVICE_MEDIA",
        //         UserActivityDesc: `Added media ${media.fileName} to device ${device.name}`
        //     }
        // });

        logActivity(
            userId,
            businessId,
            "CREATED_DEVICE_MEDIA",
            `Created device media for device ${device.name}`
        )

        sendRealtimeUpdate(
            businessId,
            "DEVICE_MEDIA_CREATED",
            deviceMedia
        );

        return deviceMedia;

    } catch (error: any) {
        throw new Error(`ERROR_CREATING_DEVICE_MEDIA: ${error.message}`);
    }
};


/* ================================
   GET DEVICE MEDIA
================================ */
const getDeviceMediaService = async (
    deviceId: number,
    businessId: number
) => {

    try {

        const device = await prisma.device.findFirst({
            where: { id: deviceId, businessId }
        });

        if (!device) {
            throw new Error("DEVICE_NOT_FOUND");
        }

        const deviceMedia = await prisma.deviceMedia.findMany({
            where: { deviceId },
            include: { media: true },
            orderBy: { position: "asc" }
        });

        return deviceMedia;

    } catch (error: any) {
        throw new Error(`ERROR_FETCHING_DEVICE_MEDIA: ${error.message}`);
    }
};


/* ================================
   UPDATE DEVICE MEDIA
================================ */
const updateDeviceMediaService = async ({
    deviceMediaId,
    position,
    businessId,
    userId
}: UpdateDeviceMediaInput) => {

    try {

        if (!deviceMediaId) {
            throw new Error("DEVICE_MEDIA_ID_REQUIRED");
        }

        const existing = await prisma.deviceMedia.findFirst({
            where: { id: deviceMediaId },
            include: { device: true }
        });

        if (!existing) {
            throw new Error("DEVICE_MEDIA_NOT_FOUND");
        }

        if (existing.device.businessId !== businessId) {
            throw new Error("UNAUTHORIZED");
        }

        const updated = await prisma.deviceMedia.update({
            where: { id: deviceMediaId },
            data: {
                ...(position !== undefined && { position })
            }
        });

        // await prisma.userActivity.create({
        //     data: {
        //         businessId,
        //         userId,
        //         userActivityType: "UPDATED_DEVICE_MEDIA",
        //         UserActivityDesc: `Updated media position to ${position}`
        //     }
        // });

        logActivity(
            userId,
            businessId,
            "UPDATED_DEVICE_MEDIA",
            `Updated media position to ${position}`
        )

        sendRealtimeUpdate(
            businessId,
            "DEVICE_MEDIA_UPDATED",
            updated
        );

        return updated;

    } catch (error: any) {
        throw new Error(`ERROR_UPDATING_DEVICE_MEDIA: ${error.message}`);
    }
};


/* ================================
   DELETE DEVICE MEDIA
================================ */
const deleteDeviceMediaService = async (
    deviceMediaId: number,
    businessId: number,
    userId: number
) => {

    try {

        if (!deviceMediaId) {
            throw new Error("DEVICE_MEDIA_ID_REQUIRED");
        }

        const existing = await prisma.deviceMedia.findFirst({
            where: { id: deviceMediaId },
            include: { device: true }
        });

        if (!existing) {
            throw new Error("DEVICE_MEDIA_NOT_FOUND");
        }

        if (existing.device.businessId !== businessId) {
            throw new Error("UNAUTHORIZED");
        }

        await prisma.deviceMedia.delete({
            where: { id: deviceMediaId }
        });

        logActivity(
            userId,
            businessId,
            "DELETED_DEVICE_MEDIA",
            `Removed media from device`
        )

        sendRealtimeUpdate(
            businessId,
            "DEVICE_MEDIA_DELETED",
            { id: deviceMediaId }
        );

        return { success: true };

    } catch (error: any) {
        throw new Error(`ERROR_DELETING_DEVICE_MEDIA: ${error.message}`);
    }
};


export {
    createDeviceMediaService,
    getDeviceMediaService,
    updateDeviceMediaService,
    deleteDeviceMediaService
};