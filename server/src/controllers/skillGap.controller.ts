import { Request, Response } from "express";

import { ResumeDocument } from "../db/types";
import { getResumeById } from "../db/queries";
import { skillGapRequestSchema } from "../schemas/requestSchemas";
import { aiService } from "../services/ai.service";

export const skillGapController = async (req: Request, res: Response) => {
  const input = skillGapRequestSchema.parse(req.body);

  const resumeRow = await getResumeById(input.resumeId);
  const resume = resumeRow.parsed_json as ResumeDocument;

  const skillGap = await aiService.skillGap({
    resume,
    jobDescription: input.jobDescriptionText,
  });

  res.json(skillGap);
};
