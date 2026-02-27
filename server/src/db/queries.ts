import { env } from "../config";
import { ApiError } from "../utils/errors";
import { supabase } from "./supabase";

const must = <T>(value: T | null, message: string): T => {
  if (!value) {
    throw new ApiError(404, message);
  }
  return value;
};

export const createResume = async (params: {
  originalFilename: string;
  originalFilePath: string;
  parsedJson: unknown;
}) => {
  const { data, error } = await supabase
    .from("resumes")
    .insert({
      user_id: env.DEMO_USER_ID,
      original_filename: params.originalFilename,
      original_file_path: params.originalFilePath,
      parsed_json: params.parsedJson,
    })
    .select("*")
    .single();

  if (error) {
    throw new ApiError(500, "Failed to create resume", error);
  }

  return data;
};

export const getResumeById = async (resumeId: string) => {
  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("id", resumeId)
    .eq("user_id", env.DEMO_USER_ID)
    .single();

  if (error) {
    throw new ApiError(404, "Resume not found", error);
  }

  return data;
};

export const createJobDescription = async (params: {
  title?: string;
  company?: string;
  content: string;
}) => {
  const { data, error } = await supabase
    .from("job_descriptions")
    .insert({
      user_id: env.DEMO_USER_ID,
      title: params.title ?? null,
      company: params.company ?? null,
      content: params.content,
    })
    .select("*")
    .single();

  if (error) {
    throw new ApiError(500, "Failed to save job description", error);
  }

  return data;
};

export const createAnalysis = async (params: {
  resumeId: string;
  jobDescriptionId: string;
  atsScore: number;
  keywordMatch: number;
  skillRelevance: number;
  experienceAlignment: number;
  formattingQuality: number;
  missingSkills: string[];
  weakSections: string[];
  feedbackJson: unknown;
  interviewChance: string;
  nextSteps: string[];
}) => {
  const { data, error } = await supabase
    .from("analyses")
    .insert({
      resume_id: params.resumeId,
      job_description_id: params.jobDescriptionId,
      ats_score: params.atsScore,
      keyword_match: params.keywordMatch,
      skill_relevance: params.skillRelevance,
      experience_alignment: params.experienceAlignment,
      formatting_quality: params.formattingQuality,
      missing_skills: params.missingSkills,
      weak_sections: params.weakSections,
      feedback_json: params.feedbackJson,
      interview_chance: params.interviewChance,
      next_steps: params.nextSteps,
    })
    .select("*")
    .single();

  if (error) {
    throw new ApiError(500, "Failed to save analysis", error);
  }

  return data;
};

export const createResumeVersion = async (params: {
  resumeId: string;
  analysisId: string;
  label: string;
  contentJson: unknown;
  atsScore: number;
  improvementReason: string;
  docxPath?: string | null;
  pdfPath?: string | null;
  texPath?: string | null;
}) => {
  const { data, error } = await supabase
    .from("resume_versions")
    .insert({
      resume_id: params.resumeId,
      analysis_id: params.analysisId,
      label: params.label,
      content_json: params.contentJson,
      ats_score: params.atsScore,
      improvement_reason: params.improvementReason,
      docx_path: params.docxPath ?? null,
      pdf_path: params.pdfPath ?? null,
      tex_path: params.texPath ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new ApiError(500, "Failed to save resume version", error);
  }

  return data;
};

export const listResumeVersions = async (resumeId: string) => {
  const { data, error } = await supabase
    .from("resume_versions")
    .select("*")
    .eq("resume_id", resumeId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new ApiError(500, "Failed to fetch resume versions", error);
  }

  return data;
};

export const getResumeWithAnalyses = async (resumeId: string) => {
  const resume = await getResumeById(resumeId);

  const { data: analyses, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("resume_id", resumeId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ApiError(500, "Failed to fetch analyses", error);
  }

  return {
    ...resume,
    analyses,
  };
};

export const getResumeVersionById = async (id: string) => {
  const { data, error } = await supabase.from("resume_versions").select("*").eq("id", id).single();

  if (error) {
    return null;
  }

  return data;
};

export const updateResumeVersionPaths = async (params: {
  versionId: string;
  docxPath?: string | null;
  pdfPath?: string | null;
  texPath?: string | null;
}) => {
  const updateFields: Record<string, string | null> = {};

  if (params.docxPath !== undefined) {
    updateFields.docx_path = params.docxPath;
  }
  if (params.pdfPath !== undefined) {
    updateFields.pdf_path = params.pdfPath;
  }
  if (params.texPath !== undefined) {
    updateFields.tex_path = params.texPath;
  }

  const { data, error } = await supabase
    .from("resume_versions")
    .update(updateFields)
    .eq("id", params.versionId)
    .select("*")
    .single();

  if (error) {
    throw new ApiError(500, "Failed to update resume version paths", error);
  }

  return data;
};

export const createGeneratedArtifact = async (params: {
  resumeId: string;
  analysisId: string | null;
  type: string;
  contentJson: unknown;
  docxPath?: string | null;
  pdfPath?: string | null;
}) => {
  const { data, error } = await supabase
    .from("generated_artifacts")
    .insert({
      resume_id: params.resumeId,
      analysis_id: params.analysisId,
      type: params.type,
      content_json: params.contentJson,
      docx_path: params.docxPath ?? null,
      pdf_path: params.pdfPath ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new ApiError(500, "Failed to create generated artifact", error);
  }

  return data;
};

export const getGeneratedArtifactById = async (id: string) => {
  const { data, error } = await supabase.from("generated_artifacts").select("*").eq("id", id).single();

  if (error) {
    return null;
  }

  return data;
};

export const updateGeneratedArtifactPaths = async (params: {
  artifactId: string;
  docxPath?: string | null;
  pdfPath?: string | null;
}) => {
  const updateFields: Record<string, string | null> = {};
  if (params.docxPath !== undefined) {
    updateFields.docx_path = params.docxPath;
  }
  if (params.pdfPath !== undefined) {
    updateFields.pdf_path = params.pdfPath;
  }

  const { data, error } = await supabase
    .from("generated_artifacts")
    .update(updateFields)
    .eq("id", params.artifactId)
    .select("*")
    .single();

  if (error) {
    throw new ApiError(500, "Failed to update generated artifact paths", error);
  }

  return data;
};

export const ensureResumeVersion = async (id: string) => {
  return must(await getResumeVersionById(id), "Resume version not found");
};

export const ensureArtifact = async (id: string) => {
  return must(await getGeneratedArtifactById(id), "Artifact not found");
};
