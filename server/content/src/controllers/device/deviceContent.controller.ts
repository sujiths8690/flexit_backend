import { Request, Response } from "express";
import {
    createDeviceMediaService,
    getDeviceMediaService,
    updateDeviceMediaService,
    deleteDeviceMediaService
} from "../../services/device/deviceContent.services";

import { successResponse, errorResponse } from "../../utils/response.helper";
import { HTTP_STATUS } from "../../utils/httpStatus";


/* ================================
   CREATE DEVICE MEDIA
================================ */
export const createDeviceMediaController = async (req: Request, res: Response) => {
    try {
        const { deviceId, mediaId, position } = req.body;

        if (!deviceId || !mediaId) {
            return errorResponse(
                res,
                "deviceId and mediaId are required",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const deviceMedia = await createDeviceMediaService({
            deviceId,
            mediaId,
            position,
            businessId: req.user!.businessId,
            userId: req.user!.userId
        });

        return successResponse(
            res,
            deviceMedia,
            "Device media created successfully",
            HTTP_STATUS.CREATED
        );

    } catch (error: any) {
        return errorResponse(
            res,
            error.message,
            HTTP_STATUS.BAD_REQUEST
        );
    }
};


/* ================================
   GET DEVICE MEDIA
================================ */
export const getDeviceMediaController = async (req: Request, res: Response) => {
    try {
        const deviceId = Number(req.params.deviceId);

        if (isNaN(deviceId)) {
            return errorResponse(
                res,
                "Invalid deviceId",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const data = await getDeviceMediaService(
            deviceId,
            req.user!.businessId
        );

        return successResponse(
            res,
            data,
            "Device media fetched successfully",
            HTTP_STATUS.OK
        );

    } catch (error: any) {
        return errorResponse(
            res,
            error.message,
            HTTP_STATUS.BAD_REQUEST
        );
    }
};


/* ================================
   UPDATE DEVICE MEDIA
================================ */
export const updateDeviceMediaController = async (req: Request, res: Response) => {
    try {
        const deviceMediaId = Number(req.params.deviceMediaId);
        const { position } = req.body;

        if (isNaN(deviceMediaId)) {
            return errorResponse(
                res,
                "Invalid deviceMediaId",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const updated = await updateDeviceMediaService({
            deviceMediaId,
            position,
            businessId: req.user!.businessId,
            userId: req.user!.userId
        });

        return successResponse(
            res,
            updated,
            "Device media updated successfully",
            HTTP_STATUS.OK
        );

    } catch (error: any) {
        return errorResponse(
            res,
            error.message,
            HTTP_STATUS.BAD_REQUEST
        );
    }
};


/* ================================
   DELETE DEVICE MEDIA
================================ */
export const deleteDeviceMediaController = async (req: Request, res: Response) => {
    try {
        const deviceMediaId = Number(req.params.deviceMediaId);

        if (isNaN(deviceMediaId)) {
            return errorResponse(
                res,
                "Invalid deviceMediaId",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const result = await deleteDeviceMediaService(
            deviceMediaId,
            req.user!.businessId,
            req.user!.userId
        );

        return successResponse(
            res,
            result,
            "Device media deleted successfully",
            HTTP_STATUS.OK
        );

    } catch (error: any) {
        return errorResponse(
            res,
            error.message,
            HTTP_STATUS.BAD_REQUEST
        );
    }
};