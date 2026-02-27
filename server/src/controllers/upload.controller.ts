import path from "node:path";
import { randomUUID } from "node:crypto";

import { Request, Response } from "express";

import { env } from "../config";
import { uploadInputFile } from "../services/storage.service";
import { ApiError } from "../utils/errors";

const allowedExtensions = new Set([".pdf", ".docx", ".tex"]);

export const uploadResumeController = async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, "No file uploaded");
  }

  const extension = path.extname(req.file.originalname).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    throw new ApiError(400, "Unsupported file type. Use PDF, DOCX, or TEX");
  }

  const uploadId = randomUUID();
  const storagePath = `${env.DEMO_USER_ID}/${uploadId}${extension}`;
  await uploadInputFile(storagePath, req.file.buffer, req.file.mimetype || "application/octet-stream");

  res.status(201).json({
    uploadId,
    filePath: storagePath,
    filename: req.file.originalname,
    size: req.file.size,
    mimeType: req.file.mimetype || "application/octet-stream",
    warnings: ["Upload complete. Parsing and scoring happen during analyze."],
  });
};
