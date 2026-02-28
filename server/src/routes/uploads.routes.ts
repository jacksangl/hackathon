import { Router } from "express";

import {
  deleteUploadedResumeController,
  listUploadedResumesController,
} from "../controllers/uploads.controller";
import { asyncHandler } from "../utils/errors";

export const uploadsRouter = Router();

uploadsRouter.get("/uploaded-resumes", asyncHandler(listUploadedResumesController));
uploadsRouter.delete("/uploaded-resumes", asyncHandler(deleteUploadedResumeController));
