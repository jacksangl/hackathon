import path from "node:path";
import { randomUUID } from "node:crypto";

import { Request, Response } from "express";

import { env } from "../config";
import { uploadInputFile } from "../services/storage.service";
import { ApiError } from "../utils/errors";

const allowedExtensions = new Set([".pdf", ".docx", ".tex"]);

const sanitizeFileName = (name: string): string => {
  return path
    .basename(name)
    .replace(/[^A-Za-z0-9._()\- ]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
};

export const uploadResumeController = async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, "No file uploaded");
  }

  const extension = path.extname(req.file.originalname).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    throw new ApiError(400, "Unsupported file type. Use PDF, DOCX, or TEX");
  }

  const uploadId = randomUUID();
  const contentType = req.file.mimetype || "application/octet-stream";
  const safeOriginalName = sanitizeFileName(req.file.originalname);
  const baseName = path.basename(safeOriginalName, extension);
  let storedName = `${baseName}${extension}`;
  let storagePath = `${env.DEMO_USER_ID}/${storedName}`;
  let warnings: string[] = ["Upload complete. Parsing and scoring happen during analyze."];
  let uploaded = false;

  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      await uploadInputFile(storagePath, req.file.buffer, contentType);
      uploaded = true;
      break;
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.statusCode === 409
      ) {
        const suffix = attempt + 2;
        storedName = `${baseName}-${suffix}${extension}`;
        storagePath = `${env.DEMO_USER_ID}/${storedName}`;
        warnings = [`Filename already existed. Saved as ${storedName}.`];
        continue;
      }
      throw error;
    }
  }

  if (!uploaded) {
    throw new ApiError(500, "Failed to store uploaded resume after multiple filename attempts");
  }

  res.status(201).json({
    uploadId,
    filePath: storagePath,
    filename: storedName,
    size: req.file.size,
    mimeType: contentType,
    warnings,
  });
};
