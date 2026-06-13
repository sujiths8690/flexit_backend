import express from "express";
import { imageUpload, upload } from "../../utils/upload"; // multer config
import {
  uploadImageAssetController,
  uploadMediaController,
  deleteMediaController,
  getMediaController
} from "../../controllers/media/media.controller";
import { authenticate } from "../../middleware/auth";
import { createRateLimiter } from "../../utils/security";

const router = express.Router();

console.log("✅ Media routes loaded");

router.post(
  "/asset-upload",
  authenticate,
  imageUpload.single("file"),
  uploadImageAssetController
);

router.post(
  "/public-image-upload",
  createRateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 20,
    keyPrefix: "public-image-upload",
  }),
  imageUpload.single("file"),
  uploadImageAssetController
);

router.post(
  "/upload",
  authenticate,
  upload.single("file"),
  uploadMediaController
);

router.delete(
  "/:mediaId",
  authenticate,
  deleteMediaController
);

router.get("/", 
  authenticate,
  getMediaController
);

export default router;
