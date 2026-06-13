import multer from "multer";
import path from "path";
import fs from "fs";

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

const imageFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
  const allowedExt = [".jpg", ".jpeg", ".png", ".webp"];

  if (allowedMimeTypes.includes(file.mimetype)) return cb(null, true);
  if (file.mimetype === "application/octet-stream" && allowedExt.includes(ext)) {
    return cb(null, true);
  }
  return cb(new Error("Only JPG, PNG, and WebP images are allowed"));
};

// Multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

export const imageUpload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export const hasAllowedFileSignature = (file: Express.Multer.File) => {
  const fd = fs.openSync(file.path, "r");
  try {
    const header = Buffer.alloc(16);
    fs.readSync(fd, header, 0, header.length, 0);

    const isJpeg =
      header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    const isPng =
      header.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      );
    const isWebp =
      header.subarray(0, 4).toString("ascii") === "RIFF" &&
      header.subarray(8, 12).toString("ascii") === "WEBP";
    const isMp4OrMov = header.subarray(4, 8).toString("ascii") === "ftyp";

    if (file.mimetype.startsWith("image/")) {
      return isJpeg || isPng || isWebp;
    }
    if (file.mimetype.startsWith("video/")) {
      return isMp4OrMov;
    }
    return false;
  } finally {
    fs.closeSync(fd);
  }
};
