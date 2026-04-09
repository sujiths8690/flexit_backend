import { Request, Response } from "express";
import {
    registerDeviceService,
    deleteDeviceService
} from "../../services/device/deviceRegistration.service";

import { successResponse, errorResponse } from "../../utils/response.helper";
import { HTTP_STATUS } from "../../utils/httpStatus";


/* ================================
   REGISTER DEVICE
================================ */
export const registerDeviceController = async (req: Request, res: Response) => {
    try {
        const { name } = req.body;

        if (!name) {
            return errorResponse(
                res,
                "Device name is required",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const device = await registerDeviceService({
            name,
            businessId: req.user!.businessId,
            userId: req.user!.userId
        });

        return successResponse(
            res,
            device,
            "Device registered successfully",
            HTTP_STATUS.CREATED
        );

    } catch (error: any) {

        if (error.message.includes("BUSINESS_NOT_FOUND")) {
            return errorResponse(res, error.message, HTTP_STATUS.NOT_FOUND);
        }

        return errorResponse(
            res,
            error.message,
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};


/* ================================
   DELETE DEVICE
================================ */
export const deleteDeviceController = async (req: Request, res: Response) => {
    try {
        const deviceId = Number(req.params.deviceId);

        if (isNaN(deviceId)) {
            return errorResponse(
                res,
                "Invalid deviceId",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const result = await deleteDeviceService(
            deviceId,
            req.user!.businessId,
            req.user!.userId
        );

        return successResponse(
            res,
            result,
            "Device deleted successfully",
            HTTP_STATUS.OK
        );

    } catch (error: any) {

        if (error.message.includes("DEVICE_NOT_FOUND")) {
            return errorResponse(res, error.message, HTTP_STATUS.NOT_FOUND);
        }

        return errorResponse(
            res,
            error.message,
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};