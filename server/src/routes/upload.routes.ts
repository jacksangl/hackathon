import { Router } from "express";
import multer from "multer";

import { uploadResumeController } from "../controllers/upload.controller";
import { asyncHandler } from "../utils/errors";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
});

export const uploadRouter = Router();

uploadRouter.post("/upload-resume", upload.single("file"), asyncHandler(uploadResumeController));
