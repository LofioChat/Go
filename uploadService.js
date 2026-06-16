import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import path from "path";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Multer memory storage ──────────────────────────
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|avi|webm|mp3|ogg|wav|pdf|doc|docx|xls|xlsx|txt|zip|rar|vcf/i;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (allowed.test(ext)) cb(null, true);
    else cb(new Error(`File type .${ext} not allowed`), false);
  },
});

// ─── Upload to Cloudinary ───────────────────────────
export const uploadToCloudinary = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      // Return a placeholder in dev mode
      resolve({ secure_url: `https://placehold.co/400x300?text=Media`, public_id: "dev_placeholder" });
      return;
    }
    const stream = cloudinary.uploader.upload_stream(
      { folder: "nexachat", resource_type: "auto", ...options },
      (err, result) => { if (err) reject(err); else resolve(result); }
    );
    stream.end(buffer);
  });

// ─── Delete from Cloudinary ─────────────────────────
export const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("[Cloudinary] Delete failed:", err.message);
  }
};

// ─── Upload file from request ───────────────────────
export const handleFileUpload = async (file, folder = "messages") => {
  if (!file) return null;
  const result = await uploadToCloudinary(file.buffer, {
    folder: `nexachat/${folder}`,
    resource_type: "auto",
    transformation: file.mimetype.startsWith("image/")
      ? [{ width: 1200, crop: "limit", quality: "auto:good" }]
      : undefined,
  });
  return {
    url:      result.secure_url,
    publicId: result.public_id,
    size:     file.size,
    mime:     file.mimetype,
    type: file.mimetype.startsWith("image/") ? "image"
        : file.mimetype.startsWith("video/") ? "video"
        : file.mimetype.startsWith("audio/") ? "audio"
        : "file",
  };
};
