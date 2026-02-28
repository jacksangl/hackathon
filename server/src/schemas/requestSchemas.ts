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

export const analyzeRequestSchema = z.object({
  filePath: z.string().min(1),
  jobDescriptionText: z.string().min(20),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
});

export const rewriteRequestSchema = z.object({
  resumeId: z.string().uuid(),
  section: z.string().min(1),
  text: z.string().min(1),
  jobDescriptionText: z.string().min(20),
  mode: z.enum(["inline", "full"]),
});

export const tailorRequestSchema = z.object({
  resumeId: z.string().uuid(),
  jobDescriptionText: z.string().min(20),
  label: z.string().optional(),
  resumeSections: resumeSectionsSchema.optional(),
  saveOnly: z.boolean().optional(),
});

export const coverLetterRequestSchema = z.object({
  resumeId: z.string().uuid(),
  jobDescriptionText: z.string().min(20),
  tone: z.string().default("professional"),
});

export const interviewRequestSchema = z.object({
  resumeId: z.string().uuid(),
  jobDescriptionText: z.string().min(20),
});

export const skillGapRequestSchema = z.object({
  resumeId: z.string().uuid(),
  jobDescriptionText: z.string().min(20),
});

export const resumeVersionsQuerySchema = z.object({
  resumeId: z.string().uuid(),
});

export const downloadQuerySchema = z.object({
  format: z.enum(["pdf", "docx", "tex"]),
});

export const improveRequestSchema = z.object({
  filePath: z.string().min(1),
  jobDescriptionText: z.string().min(20),
  addedSkill: z.string().optional(),
  userProfile: z
    .object({
      name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      linkedin: z.string().optional(),
      github: z.string().optional(),
      addedSkillExperience: z.string().optional(),
    })
    .optional(),
});

export const exportImprovedResumeSchema = z.object({
  latex: z.string().min(20),
  format: z.enum(["pdf", "txt", "docx", "doc"]),
});

export const deleteUploadedResumeSchema = z.object({
  filePath: z.string().min(1),
});
