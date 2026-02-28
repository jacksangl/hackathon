import { Router } from "express";

import { improveResumeController } from "../controllers/improve.controller";
import { asyncHandler } from "../utils/errors";

export const improveRouter = Router();

improveRouter.post("/improve-resume", asyncHandler(improveResumeController));
