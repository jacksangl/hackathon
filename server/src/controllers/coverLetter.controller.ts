import { Request, Response } from "express";

import { ResumeDocument } from "../db/types";
import { createGeneratedArtifact, getResumeById } from "../db/queries";
import { coverLetterRequestSchema } from "../schemas/requestSchemas";
import { aiService } from "../services/ai.service";

export const coverLetterController = async (req: Request, res: Response) => {
  const input = coverLetterRequestSchema.parse(req.body);

  const resumeRow = await getResumeById(input.resumeId);
  const resume = resumeRow.parsed_json as ResumeDocument;

  const coverLetter = await aiService.coverLetter({
    resume,
    jobDescription: input.jobDescriptionText,
    tone: input.tone,
  });

  const artifact = await createGeneratedArtifact({
    resumeId: input.resumeId,
    analysisId: null,
    type: "cover_letter",
    contentJson: coverLetter,
  });

  res.status(201).json({
    artifactId: artifact.id,
    content: coverLetter.content,
  });
};
