// lib/minio.ts
// ─────────────────────────────────────────────────────────────────
// Self-hosted MinIO wrapper.
// To migrate to AWS S3: swap MINIO_ENDPOINT for your S3 endpoint
//   and set MINIO_USE_SSL=true — no other code changes required.
// ─────────────────────────────────────────────────────────────────

import * as Minio from "minio";
import { randomUUID } from "crypto";
import path from "path";

export const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
  port: parseInt(process.env.MINIO_PORT ?? "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});

export const BUCKETS = {
  players: process.env.MINIO_BUCKET_PLAYERS ?? "handball-players",
  documents: process.env.MINIO_BUCKET_DOCS ?? "handball-documents",
} as const;

/**
 * Upload a player photo and return the public URL.
 * File is stored as: players/{playerId}/{uuid}.{ext}
 */
export async function uploadPlayerPhoto(
  playerId: string,
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<string> {
  const ext = path.extname(originalName).toLowerCase() || ".jpg";
  const objectKey = `players/${playerId}/${randomUUID()}${ext}`;

  await minioClient.putObject(BUCKETS.players, objectKey, buffer, buffer.length, {
    "Content-Type": mimeType,
  });

  // Return a public URL (bucket has anonymous read via minio_init)
  const endpoint = process.env.MINIO_ENDPOINT ?? "localhost";
  const port = process.env.MINIO_PORT ?? "9000";
  const ssl = process.env.MINIO_USE_SSL === "true";
  const protocol = ssl ? "https" : "http";
  return `${protocol}://${endpoint}:${port}/${BUCKETS.players}/${objectKey}`;
}

/**
 * Upload a medical document and return a time-limited presigned URL.
 * Documents are in a private bucket — never publicly accessible.
 */
export async function uploadDocument(
  playerId: string,
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<string> {
  const ext = path.extname(originalName).toLowerCase() || ".pdf";
  const objectKey = `medical/${playerId}/${randomUUID()}${ext}`;

  await minioClient.putObject(BUCKETS.documents, objectKey, buffer, buffer.length, {
    "Content-Type": mimeType,
  });

  return objectKey; // store key in DB; generate presigned URL on demand
}

/**
 * Generate a 1-hour presigned download URL for a private document.
 */
export async function getPresignedDocumentUrl(objectKey: string): Promise<string> {
  return minioClient.presignedGetObject(BUCKETS.documents, objectKey, 60 * 60);
}

/**
 * Delete a file (e.g. when player removes a photo).
 */
export async function deleteObject(bucket: string, objectKey: string): Promise<void> {
  await minioClient.removeObject(bucket, objectKey);
}
