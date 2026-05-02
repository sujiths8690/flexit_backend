import prisma from "../../config/prisma";
import { logActivity } from "../../utils/activityClient";
import { sendRealtimeUpdate } from "../../utils/realtimeClient";
import multer from "multer";

/* ================================
   UPLOAD MEDIA
================================ */
interface UploadMediaInput {
  file: Express.Multer.File;
  businessId: number;
  userId: number;
  token?: string; // ✅ ADD THIS
}

const uploadMediaService = async ({
  file,
  businessId,
  userId,
  token
}: UploadMediaInput) => {
  try {
    if (!file) {
      throw new Error("FILE_REQUIRED");
    }

    // Detect type
    // Detect type
    const isVideo =
      file.mimetype.startsWith("video") ||
      file.originalname.match(/\.(mp4|mov|avi|mkv)$/i);

    const type = isVideo ? "VIDEO" : "IMAGE";
    // If using cloud → replace this
    const fileUrl = file.path;

    const media = await prisma.media.create({
      data: {
        fileName: file.originalname,
        url: fileUrl,
        type,
        duration: null, // you can enhance later for video
        businessId
      }
    });

    logActivity(
      userId,
      businessId,
      "CREATED_MEDIA",
      `Uploaded media ${file.originalname}`
    );

    sendRealtimeUpdate(
      businessId,
      "MEDIA_CREATED",
      media,
      token // ✅ FIX
    );

    return media;

  } catch (error: any) {
    throw new Error(`ERROR_UPLOADING_MEDIA: ${error.message}`);
  }
};

/* ================================
   DELETE MEDIA
================================ */
interface DeleteMediaInput {
  mediaId: number;
  businessId: number;
  userId: number;
  token?: string;
}

const deleteMediaService = async ({
  mediaId,
  businessId,
  userId,
  token
}: DeleteMediaInput) => {

  try {
    if (!mediaId) {
      throw new Error("MEDIA_ID_REQUIRED");
    }

    const media = await prisma.media.findFirst({
      where: { id: mediaId, businessId },
      include: { deviceMedia: true }
    });

    if (!media) {
      throw new Error("MEDIA_NOT_FOUND");
    }

    // 🔥 Prevent delete if used in device
    if (media.deviceMedia.length > 0) {
      throw new Error("MEDIA_IN_USE_CANNOT_DELETE");
    }

    // TODO: delete from storage (local/cloud)
    // e.g., fs.unlinkSync(media.url)

    await prisma.media.delete({
      where: { id: mediaId }
    });

    logActivity(
      userId,
      businessId,
      "DELETED_MEDIA",
      `Deleted media ${media.fileName}`
    );

    sendRealtimeUpdate(
      businessId,
      "MEDIA_DELETED",
      { id: mediaId },
      token // ✅ FIX
    );

    return { success: true };

  } catch (error: any) {
    throw new Error(`ERROR_DELETING_MEDIA: ${error.message}`);
  }
};

/* ================================
   GET ALL MEDIA
================================ */
interface GetMediaInput {
  businessId: number;
}

const getMediaService = async ({ businessId }: GetMediaInput) => {
  try {
    const media = await prisma.media.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" }
    });

    return media;

  } catch (error: any) {
    throw new Error(`ERROR_FETCHING_MEDIA: ${error.message}`);
  }
};

export {
  uploadMediaService,
  deleteMediaService,
  getMediaService
};