import { Request, Response } from "express";

import { ResumeDocument } from "../db/types";
import { getResumeById } from "../db/queries";
import { interviewRequestSchema } from "../schemas/requestSchemas";
import { aiService } from "../services/ai.service";

export const interviewController = async (req: Request, res: Response) => {
  const input = interviewRequestSchema.parse(req.body);

  const resumeRow = await getResumeById(input.resumeId);
  const resume = resumeRow.parsed_json as ResumeDocument;

  const interview = await aiService.interviewQuestions({
    resume,
    jobDescription: input.jobDescriptionText,
  });

  res.json(interview);
};
