import { z } from "zod";

export const atsBreakdownSchema = z.object({
  keywordMatch: z.number(),
  skillRelevance: z.number(),
  experienceAlignment: z.number(),
  formattingQuality: z.number(),
});

export const analyzeResponseSchema = z.object({
  analysisId: z.string().uuid(),
  versionId: z.string().uuid(),
  atsScore: z.number(),
  breakdown: atsBreakdownSchema,
  missingSkills: z.array(z.string()),
  weakSections: z.array(z.string()),
  interviewChance: z.string(),
  nextSteps: z.array(z.string()),
  feedback: z.array(z.string()),
});
