import { Router } from "express";

import { analyzeController } from "../controllers/analyze.controller";
import { asyncHandler } from "../utils/errors";

export const analyzeRouter = Router();

analyzeRouter.post("/analyze", asyncHandler(analyzeController));
