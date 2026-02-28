import { z } from "zod";

const resumeSectionsSchema = z.object({
  summary: z.array(z.string()),
  experience: z.array(z.string()),
  education: z.array(z.string()),
  skills: z.array(z.string()),
  projects: z.array(z.string()),
  certifications: z.array(z.string()),
  other: z.array(z.string()),
});

export const atsBreakdownSchema = z.object({
  keywordMatch: z.number(),
  skillRelevance: z.number(),
  experienceAlignment: z.number(),
  formattingQuality: z.number(),
});

export const analyzeResponseSchema = z.object({
  resumeSections: resumeSectionsSchema,
  atsScore: z.number(),
  breakdown: atsBreakdownSchema,
  missingSkills: z.array(z.string()),
  missingQualifications: z.array(z.string()),
  weakSections: z.array(z.string()),
  fitVerdict: z.enum(["fit", "not_fit"]),
  disqualifiers: z.array(z.string()),
  interviewChance: z.string(),
  nextSteps: z.array(z.string()),
  feedback: z.array(z.string()),
});
