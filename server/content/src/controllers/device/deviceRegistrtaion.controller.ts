import { Request, Response } from "express";
import {
    registerDeviceService,
    pairDeviceByCodeService,
    listDevicesByBusinessService,
    getDeviceConfigByCodeService,
    updateDeviceConfigService,
    deleteDeviceService
} from "../../services/device/deviceRegistration.service";

import { successResponse, errorResponse } from "../../utils/response.helper";
import { HTTP_STATUS } from "../../utils/httpStatus";

const bearerTokenFromRequest = (req: Request) =>
    req.headers.authorization?.split(" ")[1];


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
            userId: req.user!.userId,
            token: bearerTokenFromRequest(req)
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
   PAIR DEVICE BY DISPLAY CODE
================================ */
export const pairDeviceController = async (req: Request, res: Response) => {
    try {
        const { deviceCode, name, businessId: bodyBusinessId } = req.body;

        if (!deviceCode || typeof deviceCode !== "string") {
            return errorResponse(
                res,
                "Device code is required",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const businessId =
            req.user!.businessId ?? Number(bodyBusinessId);

        if (!businessId || Number.isNaN(businessId)) {
            return errorResponse(
                res,
                "Please log out and log in again before pairing this display.",
                HTTP_STATUS.UNAUTHORIZED
            );
        }

        const device = await pairDeviceByCodeService({
            deviceCode,
            name,
            businessId,
            userId: req.user!.userId,
            token: bearerTokenFromRequest(req)
        });

        return successResponse(
            res,
            device,
            "Device paired successfully",
            HTTP_STATUS.OK
        );

    } catch (error: any) {

        if (error.message.includes("BUSINESS_NOT_FOUND")) {
            return errorResponse(res, error.message, HTTP_STATUS.NOT_FOUND);
        }

        if (error.message.includes("DEVICE_ALREADY_PAIRED")) {
            return errorResponse(res, error.message, HTTP_STATUS.CONFLICT);
        }

        if (error.message.includes("DEVICE_NAME_ALREADY_EXISTS")) {
            return errorResponse(res, error.message, HTTP_STATUS.CONFLICT);
        }

        return errorResponse(
            res,
            error.message,
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};


/* ================================
   LIST DEVICES FOR BUSINESS
================================ */
export const listDevicesController = async (req: Request, res: Response) => {
    try {
        const devices = await listDevicesByBusinessService(req.user!.businessId);

        return successResponse(
            res,
            devices,
            "Devices fetched successfully",
            HTTP_STATUS.OK
        );

    } catch (error: any) {
        return errorResponse(
            res,
            error.message,
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};


/* ================================
   PUBLIC DISPLAY CONFIG LOOKUP
================================ */
export const getDeviceConfigController = async (req: Request, res: Response) => {
    try {
        const deviceCode = req.params.deviceCode;

        if (!deviceCode || typeof deviceCode !== "string") {
            return errorResponse(
                res,
                "Device code is required",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const config = await getDeviceConfigByCodeService(deviceCode);

        return successResponse(
            res,
            config,
            "Device config fetched successfully",
            HTTP_STATUS.OK
        );

    } catch (error: any) {
        return errorResponse(
            res,
            error.message,
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};


/* ================================
   UPDATE DISPLAY CONFIG
================================ */
export const updateDeviceConfigController = async (req: Request, res: Response) => {
    try {
        const deviceId = Number(req.params.deviceId);

        if (isNaN(deviceId)) {
            return errorResponse(
                res,
                "Invalid deviceId",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const {
            name,
            orientation,
            menuTheme,
            themeColor,
            displayContentMode,
            selectedCategoryId,
            selectedMediaId,
            transitionStyle,
            transitionSpeedSeconds,
            autoScrollIntervalSeconds
        } = req.body;

        const device = await updateDeviceConfigService({
            deviceId,
            businessId: req.user!.businessId,
            userId: req.user!.userId,
            name,
            orientation,
            menuTheme,
            themeColor,
            displayContentMode,
            selectedCategoryId,
            selectedMediaId,
            transitionStyle,
            transitionSpeedSeconds,
            autoScrollIntervalSeconds,
            token: bearerTokenFromRequest(req)
        });

        return successResponse(
            res,
            device,
            "Device config updated successfully",
            HTTP_STATUS.OK
        );

    } catch (error: any) {
        if (
            error.message.includes("DEVICE_NOT_FOUND") ||
            error.message.includes("INVALID_") ||
            error.message.includes("DEVICE_NAME_REQUIRED")
        ) {
            return errorResponse(res, error.message, HTTP_STATUS.BAD_REQUEST);
        }

        if (error.message.includes("DEVICE_NAME_ALREADY_EXISTS")) {
            return errorResponse(res, error.message, HTTP_STATUS.CONFLICT);
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
            req.user!.userId,
            bearerTokenFromRequest(req)
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
