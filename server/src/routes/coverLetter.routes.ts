import { Router } from "express";

import { coverLetterController } from "../controllers/coverLetter.controller";
import { asyncHandler } from "../utils/errors";

export const coverLetterRouter = Router();

coverLetterRouter.post("/cover-letter", asyncHandler(coverLetterController));
