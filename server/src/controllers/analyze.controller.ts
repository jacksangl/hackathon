import { Request, Response } from "express";

import { aiService } from "../services/ai.service";
import { scoreResumeAgainstJob } from "../services/atsScoring.service";
import { parseResumeFile } from "../services/parser.service";
import { downloadInputFile } from "../services/storage.service";
import { analyzeRequestSchema } from "../schemas/requestSchemas";
import { ApiError } from "../utils/errors";
import path from "node:path";

export const analyzeController = async (req: Request, res: Response) => {
  const input = analyzeRequestSchema.parse(req.body);

  const extension = path.extname(input.filePath).toLowerCase();
  const supported = [".pdf", ".docx", ".tex"];
  if (!supported.includes(extension)) {
    throw new ApiError(400, "Unsupported file extension in filePath");
  }

  const fileBuffer = await downloadInputFile(input.filePath);
  const parsedFileName = `resume${extension}`;
  const resume = await parseResumeFile(fileBuffer, parsedFileName);
  const scoring = scoreResumeAgainstJob(resume, input.jobDescriptionText);
  const ai = await aiService.analyze({
    resume,
    jobDescription: input.jobDescriptionText,
    atsScore: scoring.atsScore,
    missingSkills: scoring.missingSkills,
    weakSections: scoring.weakSections,
  });

  res.json({
    resumeSections: resume.sections,
    atsScore: scoring.atsScore,
    breakdown: scoring.breakdown,
    missingSkills: scoring.missingSkills,
    weakSections: scoring.weakSections,
    interviewChance: scoring.interviewChance,
    nextSteps: scoring.nextSteps,
    feedback: ai.feedback,
    sectionRecommendations: ai.sectionRecommendations,
    missingKeywords: ai.missingKeywords,
    coverLetterStarter: ai.coverLetterStarter,
    interviewQuestionsStarter: ai.interviewQuestionsStarter,
    skillGapStarter: ai.skillGapStarter,
  });
};
