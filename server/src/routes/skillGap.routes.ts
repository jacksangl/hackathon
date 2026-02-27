import { Router } from "express";

import { skillGapController } from "../controllers/skillGap.controller";
import { asyncHandler } from "../utils/errors";

export const skillGapRouter = Router();

skillGapRouter.post("/skill-gap", asyncHandler(skillGapController));
