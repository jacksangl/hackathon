import { Router } from "express";

import { downloadController } from "../controllers/download.controller";
import { asyncHandler } from "../utils/errors";

export const downloadRouter = Router();

downloadRouter.get("/download/:id", asyncHandler(downloadController));
