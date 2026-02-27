import path from "node:path";
import { randomUUID } from "node:crypto";

import { Request, Response } from "express";

import { env } from "../config";
import { createResume } from "../db/queries";
import { parseResumeFile } from "../services/parser.service";
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

  const parsed = await parseResumeFile(req.file.buffer, req.file.originalname);

  const storagePath = `${env.DEMO_USER_ID}/${randomUUID()}${extension}`;
  await uploadInputFile(storagePath, req.file.buffer, req.file.mimetype || "application/octet-stream");

  const resume = await createResume({
    originalFilename: req.file.originalname,
    originalFilePath: storagePath,
    parsedJson: parsed,
  });

  res.status(201).json({
    resumeId: resume.id,
    parsedSections: parsed.sections,
    warnings: [],
  });
};
