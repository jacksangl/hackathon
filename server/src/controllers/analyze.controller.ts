import { Request, Response } from "express";

import { ResumeDocument } from "../db/types";
import {
  createAnalysis,
  createJobDescription,
  createResumeVersion,
  getResumeById,
} from "../db/queries";
import { aiService } from "../services/ai.service";
import { scoreResumeAgainstJob } from "../services/atsScoring.service";
import { analyzeRequestSchema } from "../schemas/requestSchemas";
import { buildVersionLabel } from "../services/versioning.service";

export const analyzeController = async (req: Request, res: Response) => {
  const input = analyzeRequestSchema.parse(req.body);

  const resumeRow = await getResumeById(input.resumeId);
  const resume = resumeRow.parsed_json as ResumeDocument;

  const job = await createJobDescription({
    title: input.jobTitle,
    company: input.company,
    content: input.jobDescriptionText,
  });

  const scoring = scoreResumeAgainstJob(resume, input.jobDescriptionText);
  const ai = await aiService.analyze({
    resume,
    jobDescription: input.jobDescriptionText,
    atsScore: scoring.atsScore,
    missingSkills: scoring.missingSkills,
    weakSections: scoring.weakSections,
  });

  const analysis = await createAnalysis({
    resumeId: input.resumeId,
    jobDescriptionId: job.id,
    atsScore: scoring.atsScore,
    keywordMatch: scoring.breakdown.keywordMatch,
    skillRelevance: scoring.breakdown.skillRelevance,
    experienceAlignment: scoring.breakdown.experienceAlignment,
    formattingQuality: scoring.breakdown.formattingQuality,
    missingSkills: scoring.missingSkills,
    weakSections: scoring.weakSections,
    feedbackJson: ai,
    interviewChance: scoring.interviewChance,
    nextSteps: scoring.nextSteps,
  });

  const baselineVersion = await createResumeVersion({
    resumeId: input.resumeId,
    analysisId: analysis.id,
    label: buildVersionLabel("Baseline"),
    contentJson: resume,
    atsScore: scoring.atsScore,
    improvementReason: "Initial parsed resume baseline score.",
  });

  res.json({
    analysisId: analysis.id,
    versionId: baselineVersion.id,
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
