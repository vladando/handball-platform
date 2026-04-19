// lib/storage.ts
// Cloudinary cloud storage for production.
// Falls back to local filesystem if Cloudinary is not configured.

import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const ALLOWED_DOC_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// ── Upload to Cloudinary ───────────────────────────────────
async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  fileType: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        format: fileType === "image/gif" ? "gif" : "webp",
        quality: "auto",
        fetch_format: "auto",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!.secure_url);
      }
    );
    stream.end(buffer);
  });
}

// ── Delete from Cloudinary ─────────────────────────────────
async function deleteFromCloudinary(url: string): Promise<void> {
  try {
    // Extract public_id from URL
    // URL format: https://res.cloudinary.com/{cloud}/image/upload/v{ver}/{folder}/{id}.{ext}
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    if (match) {
      await cloudinary.uploader.destroy(match[1]);
    }
  } catch {
    // best-effort
  }
}

// ── Local filesystem fallback ──────────────────────────────
const LOCAL_PLAYER_DIR = path.join(process.cwd(), "public", "uploads", "players");
const LOCAL_VERIFY_DIR = path.join(process.cwd(), "public", "uploads", "verification");

async function uploadLocally(
  buffer: Buffer,
  dir: string,
  filename: string
): Promise<string> {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buffer);
  const rel = path.relative(path.join(process.cwd(), "public"), path.join(dir, filename));
  return "/" + rel.replace(/\\/g, "/");
}

// ── Public API ─────────────────────────────────────────────
export async function savePlayerImage(
  playerId: string,
  file: File
): Promise<{ url: string; error?: never } | { url?: never; error: string }> {
  if (!ALLOWED_TYPES[file.type]) {
    return { error: "Only JPEG, PNG, WebP and GIF images are allowed." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: "File is too large. Maximum 5 MB." };
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  try {
    if (useCloudinary) {
      const url = await uploadToCloudinary(
        buffer,
        `handball/players/${playerId}`,
        file.type
      );
      return { url };
    } else {
      const ext = ALLOWED_TYPES[file.type];
      const filename = `${randomUUID()}${ext}`;
      const dir = path.join(LOCAL_PLAYER_DIR, playerId);
      const url = await uploadLocally(buffer, dir, filename);
      return { url };
    }
  } catch (err: any) {
    return { error: err?.message ?? "Upload failed." };
  }
}

export async function saveVerificationDoc(
  userId: string,
  file: File,
  docType: string
): Promise<{ url: string; error?: never } | { url?: never; error: string }> {
  if (!ALLOWED_DOC_TYPES[file.type]) {
    return { error: "Only JPEG, PNG, WebP or PDF files are allowed." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: "File is too large. Maximum 5 MB." };
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  try {
    if (useCloudinary) {
      if (file.type === "application/pdf") {
        // Store PDFs locally even when Cloudinary is configured
        const ext = ".pdf";
        const filename = `${docType}-${randomUUID()}${ext}`;
        const dir = path.join(LOCAL_VERIFY_DIR, userId);
        const url = await uploadLocally(buffer, dir, filename);
        return { url };
      }
      const url = await uploadToCloudinary(
        buffer,
        `handball/verification/${userId}`,
        file.type
      );
      return { url };
    } else {
      const ext = ALLOWED_DOC_TYPES[file.type];
      const filename = `${docType}-${randomUUID()}${ext}`;
      const dir = path.join(LOCAL_VERIFY_DIR, userId);
      const url = await uploadLocally(buffer, dir, filename);
      return { url };
    }
  } catch (err: any) {
    return { error: err?.message ?? "Upload failed." };
  }
}

const LOCAL_CLUB_DIR = path.join(process.cwd(), "public", "uploads", "clubs");

export async function saveClubLogo(
  clubId: string,
  file: File
): Promise<{ url: string; error?: never } | { url?: never; error: string }> {
  if (!ALLOWED_TYPES[file.type]) {
    return { error: "Only JPEG, PNG, WebP and GIF images are allowed." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: "File is too large. Maximum 5 MB." };
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  try {
    if (useCloudinary) {
      const url = await uploadToCloudinary(
        buffer,
        `handball/clubs/${clubId}`,
        file.type
      );
      return { url };
    } else {
      const ext = ALLOWED_TYPES[file.type];
      const filename = `${randomUUID()}${ext}`;
      const dir = path.join(LOCAL_CLUB_DIR, clubId);
      const url = await uploadLocally(buffer, dir, filename);
      return { url };
    }
  } catch (err: any) {
    return { error: err?.message ?? "Upload failed." };
  }
}

export function deleteLocalFile(url: string) {
  if (!url) return;
  if (url.includes("cloudinary.com")) {
    deleteFromCloudinary(url).catch(() => {});
    return;
  }
  try {
    const rel = url.replace(/^\//, "");
    const abs = path.join(process.cwd(), "public", rel);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch {
    // best-effort
  }
}
