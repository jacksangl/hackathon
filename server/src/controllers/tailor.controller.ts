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
import { tailorRequestSchema } from "../schemas/requestSchemas";
import { buildVersionLabel } from "../services/versioning.service";

export const tailorController = async (req: Request, res: Response) => {
  const input = tailorRequestSchema.parse(req.body);

  const resumeRow = await getResumeById(input.resumeId);
  const parsedResume = resumeRow.parsed_json as ResumeDocument;

  const baseResume: ResumeDocument = input.resumeSections
    ? {
        rawText: Object.values(input.resumeSections).flat().join("\n"),
        sections: input.resumeSections,
        extractedKeywords: parsedResume.extractedKeywords,
      }
    : parsedResume;

  const job = await createJobDescription({
    content: input.jobDescriptionText,
  });

  const tailored = input.saveOnly
    ? {
        tailoredResume: baseResume,
        improvementReason: "Manual edits saved and rescored.",
      }
    : await aiService.tailor({
        resume: baseResume,
        jobDescription: input.jobDescriptionText,
      });

  const scoring = scoreResumeAgainstJob(tailored.tailoredResume, input.jobDescriptionText);

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
    feedbackJson: {
      feedback: [tailored.improvementReason],
    },
    interviewChance: scoring.interviewChance,
    nextSteps: scoring.nextSteps,
  });

  const version = await createResumeVersion({
    resumeId: input.resumeId,
    analysisId: analysis.id,
    label:
      input.label ??
      (input.saveOnly ? buildVersionLabel("Edited") : buildVersionLabel("Tailored")),
    contentJson: tailored.tailoredResume,
    atsScore: scoring.atsScore,
    improvementReason: tailored.improvementReason,
  });

  res.status(201).json({
    versionId: version.id,
    atsScore: scoring.atsScore,
    improvementReason: tailored.improvementReason,
    breakdown: scoring.breakdown,
  });
};
