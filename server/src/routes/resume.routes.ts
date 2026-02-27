import { Router } from "express";

import { getResumeController, resumeVersionsController } from "../controllers/resume.controller";
import { asyncHandler } from "../utils/errors";

export const resumeRouter = Router();

resumeRouter.get("/resume-versions", asyncHandler(resumeVersionsController));
resumeRouter.get("/resume/:id", asyncHandler(getResumeController));
