import { Request, Response } from "express";
import fs from "fs";
import {
  uploadMediaService,
  deleteMediaService,
  getMediaService
} from "../../services/media/media.services";

import { successResponse, errorResponse } from "../../utils/response.helper";
import { HTTP_STATUS } from "../../utils/httpStatus";
import { hasAllowedFileSignature } from "../../utils/upload";

const publicUploadUrl = (req: Request, file: Express.Multer.File) => {
  const configuredBase = process.env.PUBLIC_UPLOAD_BASE_URL?.replace(/\/$/, "");
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const fallbackBase = `${forwardedProto || req.protocol}://${forwardedHost || req.get("host")}`;
  return `${configuredBase || fallbackBase}/uploads/${file.filename}`;
};

export const uploadImageAssetController = async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File;
    if (!file) {
      return errorResponse(res, "File is required", HTTP_STATUS.BAD_REQUEST);
    }
    if (!file.mimetype.startsWith("image/")) {
      fs.unlink(file.path, () => {});
      return errorResponse(res, "Only images are allowed", HTTP_STATUS.BAD_REQUEST);
    }
    if (!hasAllowedFileSignature(file)) {
      fs.unlink(file.path, () => {});
      return errorResponse(res, "Invalid image file", HTTP_STATUS.BAD_REQUEST);
    }

    return successResponse(
      res,
      {
        url: publicUploadUrl(req, file),
        fileName: file.originalname,
        contentType: file.mimetype,
      },
      "Image uploaded successfully",
      HTTP_STATUS.CREATED
    );
  } catch (error: any) {
    return errorResponse(res, error.message, HTTP_STATUS.BAD_REQUEST);
  }
};


/* ================================
   UPLOAD MEDIA
================================ */
export const uploadMediaController = async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File;

    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!file) {
      return errorResponse(
        res,
        "File is required",
        HTTP_STATUS.BAD_REQUEST
      );
    }
    if (!hasAllowedFileSignature(file)) {
      fs.unlink(file.path, () => {});
      return errorResponse(
        res,
        "File content does not match an allowed image or video format",
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const media = await uploadMediaService({
      file,
      businessId: req.user!.businessId,
      userId: req.user!.userId,
      token
    });

    return successResponse(
      res,
      media,
      "Media uploaded successfully",
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
   DELETE MEDIA
================================ */
export const deleteMediaController = async (req: Request, res: Response) => {
  try {
    const mediaId = Number(req.params.mediaId);

    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (isNaN(mediaId)) {
      return errorResponse(
        res,
        "Invalid mediaId",
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const result = await deleteMediaService({
      mediaId,
      businessId: req.user!.businessId,
      userId: req.user!.userId,
      token
    });

    return successResponse(
      res,
      result,
      "Media deleted successfully",
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
   GET ALL MEDIA
================================ */
export const getMediaController = async (req: Request, res: Response) => {
  try {
    const media = await getMediaService({
      businessId: req.user!.businessId
    });

    return successResponse(
      res,
      media,
      "Media fetched successfully",
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

