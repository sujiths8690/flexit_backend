import express from "express";
import { upload } from "../../utils/upload"; // multer config
import {
  uploadMediaController,
  deleteMediaController,
  getMediaController
} from "../../controllers/media/media.controller";
import { authenticate } from "../../middleware/auth";

const router = express.Router();

console.log("✅ Media routes loaded");

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