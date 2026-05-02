import multer from "multer";
import path from "path";

// Storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // make sure this folder exists
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, uniqueName);
  }
});

// File filter (only images & videos)
const fileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/quicktime",
  ];

  const ext = path.extname(file.originalname).toLowerCase();

  const allowedExt = [".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov"];

  // ✅ Allow proper mimetypes
  if (allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  // 🔥 Allow Flutter uploads (fallback)
  if (file.mimetype === "application/octet-stream") {
    if (allowedExt.includes(ext)) {
      return cb(null, true);
    }
  }

  return cb(new Error("Only images and videos are allowed"));
};

// Multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});