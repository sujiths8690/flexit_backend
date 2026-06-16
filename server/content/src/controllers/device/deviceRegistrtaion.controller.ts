import { Request, Response } from "express";
import {
    registerDeviceService,
    pairDeviceByCodeService,
    listDevicesByBusinessService,
    updateDeviceMetadataByCodeService,
    getAdminBusinessDeviceOverviewService,
    getAdminDeviceOverviewService,
    getDeviceConfigByCodeService,
    getDevicePairingStatusByCodeService,
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
        const { name, deviceInfo } = req.body;

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
            token: bearerTokenFromRequest(req),
            deviceInfo
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
        const { deviceCode, name, businessId: bodyBusinessId, deviceInfo } = req.body;

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
            token: bearerTokenFromRequest(req),
            deviceInfo
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

        if (error.message.includes("DEVICE_LIMIT_REACHED")) {
            const limit = error.message.split(":")[1];
            return errorResponse(
                res,
                `Your current plan allows up to ${limit} TV${limit === "1" ? "" : "s"}.`,
                HTTP_STATUS.BAD_REQUEST
            );
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
   PUBLIC TV DEVICE METADATA UPDATE
================================ */
export const updateDeviceMetadataController = async (
    req: Request,
    res: Response
) => {
    try {
        const { deviceCode } = req.params;
        const { deviceInfo } = req.body;

        if (!deviceCode || typeof deviceCode !== "string") {
            return errorResponse(
                res,
                "Device code is required",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const device = await updateDeviceMetadataByCodeService(
            deviceCode,
            deviceInfo
        );

        return successResponse(
            res,
            device,
            "Device metadata updated successfully",
            HTTP_STATUS.OK
        );
    } catch (error: any) {
        if (error.message === "DEVICE_NOT_FOUND") {
            return errorResponse(res, "Device not found", HTTP_STATUS.NOT_FOUND);
        }

        if (
            error.message === "DEVICE_CODE_REQUIRED" ||
            error.message === "DEVICE_INFO_REQUIRED"
        ) {
            return errorResponse(res, error.message, HTTP_STATUS.BAD_REQUEST);
        }

        return errorResponse(
            res,
            error.message,
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};

/* ================================
   ADMIN BUSINESS + DISPLAY DEVICES
================================ */
export const getAdminBusinessDeviceOverviewController = async (
    req: Request,
    res: Response
) => {
    try {
        const businessId = Number(req.params.businessId);

        if (!businessId || Number.isNaN(businessId)) {
            return errorResponse(
                res,
                "Invalid businessId",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const overview = await getAdminBusinessDeviceOverviewService(businessId);

        return successResponse(
            res,
            overview,
            "Business devices fetched successfully",
            HTTP_STATUS.OK
        );
    } catch (error: any) {
        if (error.message === "BUSINESS_NOT_FOUND") {
            return errorResponse(res, "Business not found", HTTP_STATUS.NOT_FOUND);
        }

        return errorResponse(
            res,
            error.message,
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};

/* ================================
   ADMIN ALL DISPLAY DEVICES
================================ */
export const getAdminDeviceOverviewController = async (
    req: Request,
    res: Response
) => {
    try {
        const overview = await getAdminDeviceOverviewService();

        return successResponse(
            res,
            overview,
            "Registered devices fetched successfully",
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

export const getDevicePairingStatusController = async (
    req: Request,
    res: Response
) => {
    try {
        const deviceCode = req.params.deviceCode;
        if (!deviceCode || typeof deviceCode !== "string") {
            return errorResponse(
                res,
                "Device code is required",
                HTTP_STATUS.BAD_REQUEST
            );
        }
        const status = await getDevicePairingStatusByCodeService(deviceCode);
        return successResponse(
            res,
            status,
            "Device pairing status fetched successfully",
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
            displayLanguage,
            displayContentMode,
            selectedCategoryId,
            selectedMediaId,
            transitionStyle,
            transitionSpeedSeconds,
            autoScrollIntervalSeconds,
            scheduleEnabled,
            alwaysOn,
            scheduleStartTime,
            scheduleEndTime,
            showPrice,
            showDescription,
            showLogo,
            showCompanyName,
            showProductImage,
            showDietTags,
            showComboItemQuantity,
            headingFontScale,
            nameFontScale,
            descriptionFontScale,
            priceFontScale
        } = req.body;

        const device = await updateDeviceConfigService({
            deviceId,
            businessId: req.user!.businessId,
            userId: req.user!.userId,
            name,
            orientation,
            menuTheme,
            themeColor,
            displayLanguage,
            displayContentMode,
            selectedCategoryId,
            selectedMediaId,
            transitionStyle,
            transitionSpeedSeconds,
            autoScrollIntervalSeconds,
            scheduleEnabled,
            alwaysOn,
            scheduleStartTime,
            scheduleEndTime,
            showPrice,
            showDescription,
            showLogo,
            showCompanyName,
            showProductImage,
            showDietTags,
            showComboItemQuantity,
            headingFontScale,
            nameFontScale,
            descriptionFontScale,
            priceFontScale,
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
