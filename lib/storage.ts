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

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

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
// Strategy: write files to the project-root public/ directory (persistent across
// deploys) AND to the standalone public/ directory (served immediately).
// The deploy script copies project public/ → standalone public/, so on the next
// deploy any already-uploaded files are naturally preserved.
function getPublicBase(): string {
  const cwd = process.cwd().replace(/\\/g, "/");
  if (cwd.endsWith("/.next/standalone")) {
    return path.resolve(process.cwd(), "../..", "public");
  }
  return path.join(process.cwd(), "public");
}

// Where we persist uploads long-term (project root public/).
const PUBLIC_BASE      = getPublicBase();
// Where Next.js serves static files from right now.
const SERVE_BASE       = path.join(process.cwd(), "public");
// Are we running inside the standalone build?
const IS_STANDALONE    = PUBLIC_BASE !== SERVE_BASE;

const LOCAL_PLAYER_DIR = path.join(PUBLIC_BASE, "uploads", "players");
const LOCAL_VERIFY_DIR = path.join(PUBLIC_BASE, "uploads", "verification");

async function uploadLocally(
  buffer: Buffer,
  dir: string,
  filename: string
): Promise<string> {
  // Write to persistent location (project public/)
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buffer);

  // URL is always relative to PUBLIC_BASE → /uploads/...
  const rel = path.relative(PUBLIC_BASE, path.join(dir, filename));

  // Also write to standalone public/ so the file is served immediately
  if (IS_STANDALONE) {
    try {
      const serveDir = path.join(SERVE_BASE, path.dirname(rel));
      fs.mkdirSync(serveDir, { recursive: true });
      fs.writeFileSync(path.join(SERVE_BASE, rel), buffer);
    } catch {
      // best-effort — file will appear after next deploy even if this fails
    }
  }

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
    return { error: "File is too large. Maximum 15 MB." };
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
    return { error: "File is too large. Maximum 15 MB." };
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

const LOCAL_CLUB_DIR = path.join(PUBLIC_BASE, "uploads", "clubs");

export async function saveClubLogo(
  clubId: string,
  file: File
): Promise<{ url: string; error?: never } | { url?: never; error: string }> {
  if (!ALLOWED_TYPES[file.type]) {
    return { error: "Only JPEG, PNG, WebP and GIF images are allowed." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: "File is too large. Maximum 15 MB." };
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
  const rel = url.replace(/^\//, "");
  for (const base of [PUBLIC_BASE, SERVE_BASE]) {
    try {
      const abs = path.join(base, rel);
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    } catch {
      // best-effort
    }
  }
}
