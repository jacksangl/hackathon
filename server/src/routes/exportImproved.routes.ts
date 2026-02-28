import { Router } from "express";

import { exportImprovedResumeController } from "../controllers/exportImproved.controller";
import { asyncHandler } from "../utils/errors";

export const exportImprovedRouter = Router();

exportImprovedRouter.post(
  "/export-improved-resume",
  asyncHandler(exportImprovedResumeController),
);
