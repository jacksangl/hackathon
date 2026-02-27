import { Router } from "express";

import { tailorController } from "../controllers/tailor.controller";
import { asyncHandler } from "../utils/errors";

export const tailorRouter = Router();

tailorRouter.post("/tailor", asyncHandler(tailorController));
