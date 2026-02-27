import { Router } from "express";

import { rewriteController } from "../controllers/rewrite.controller";
import { asyncHandler } from "../utils/errors";

export const rewriteRouter = Router();

rewriteRouter.post("/rewrite", asyncHandler(rewriteController));
