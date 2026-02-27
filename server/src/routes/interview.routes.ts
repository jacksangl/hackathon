import { Router } from "express";

import { interviewController } from "../controllers/interview.controller";
import { asyncHandler } from "../utils/errors";

export const interviewRouter = Router();

interviewRouter.post("/interview-questions", asyncHandler(interviewController));
