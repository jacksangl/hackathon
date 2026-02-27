import { Request, Response } from "express";

import { aiService } from "../services/ai.service";
import { rewriteRequestSchema } from "../schemas/requestSchemas";

export const rewriteController = async (req: Request, res: Response) => {
  const input = rewriteRequestSchema.parse(req.body);

  const rewriteResult = await aiService.rewrite({
    section: input.section,
    text: input.text,
    jobDescription: input.jobDescriptionText,
    mode: input.mode,
  });

  res.json(rewriteResult);
};
