// lib/storage.ts
// Local filesystem storage for development.
// Files are saved to public/uploads/ and served as static assets.

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "players");

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

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

  const ext = ALLOWED_TYPES[file.type];
  const filename = `${randomUUID()}${ext}`;
  const playerDir = path.join(UPLOAD_DIR, playerId);

  // Ensure directory exists
  fs.mkdirSync(playerDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  fs.writeFileSync(path.join(playerDir, filename), Buffer.from(bytes));

  return { url: `/uploads/players/${playerId}/${filename}` };
}

const VERIFY_DIR = path.join(process.cwd(), "public", "uploads", "verification");

export async function saveVerificationDoc(
  userId: string,
  file: File,
  docType: "passport" | "selfie"
): Promise<{ url: string; error?: never } | { url?: never; error: string }> {
  if (!ALLOWED_TYPES[file.type]) {
    return { error: "Only JPEG, PNG or WebP images are allowed." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: "File is too large. Maximum 5 MB." };
  }

  const ext = ALLOWED_TYPES[file.type];
  const filename = `${docType}-${randomUUID()}${ext}`;
  const userDir = path.join(VERIFY_DIR, userId);

  fs.mkdirSync(userDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  fs.writeFileSync(path.join(userDir, filename), Buffer.from(bytes));

  return { url: `/uploads/verification/${userId}/${filename}` };
}

export function deleteLocalFile(url: string) {
  try {
    // url is like /uploads/players/{id}/filename.jpg
    const rel = url.replace(/^\//, "");
    const abs = path.join(process.cwd(), "public", rel);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch {
    // best-effort delete
  }
}
