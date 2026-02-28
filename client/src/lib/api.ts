import axios from "axios";

import {
  AnalyzeResponse,
  CoverLetterResponse,
  DownloadResponse,
  ImproveResumeResponse,
  InterviewResponse,
  ResumeSections,
  UploadedResumesResponse,
  ResumeVersionsResponse,
  RewriteResponse,
  SkillGapResponse,
  TailorResponse,
  UploadResumeResponse,
} from "./types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5001",
  timeout: 25000,
});

export const uploadResume = async (file: File): Promise<UploadResumeResponse> => {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<UploadResumeResponse>("/upload-resume", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const analyzeResume = async (payload: {
  filePath: string;
  jobDescriptionText: string;
  jobTitle?: string;
  company?: string;
}) => {
  const { data } = await api.post<AnalyzeResponse>("/analyze", payload);
  return data;
};

export const rewriteText = async (payload: {
  resumeId: string;
  section: string;
  text: string;
  jobDescriptionText: string;
  mode: "inline" | "full";
}) => {
  const { data } = await api.post<RewriteResponse>("/rewrite", payload);
  return data;
};

export const tailorResume = async (payload: {
  resumeId: string;
  jobDescriptionText: string;
  label?: string;
  resumeSections?: ResumeSections;
  saveOnly?: boolean;
}) => {
  const { data } = await api.post<TailorResponse>("/tailor", payload);
  return data;
};

export const generateCoverLetter = async (payload: {
  resumeId: string;
  jobDescriptionText: string;
  tone?: string;
}) => {
  const { data } = await api.post<CoverLetterResponse>("/cover-letter", payload);
  return data;
};

export const generateInterviewQuestions = async (payload: {
  resumeId: string;
  jobDescriptionText: string;
}) => {
  const { data } = await api.post<InterviewResponse>("/interview-questions", payload);
  return data;
};

export const generateSkillGap = async (payload: {
  resumeId: string;
  jobDescriptionText: string;
}) => {
  const { data } = await api.post<SkillGapResponse>("/skill-gap", payload);
  return data;
};

export const getResumeVersions = async (resumeId: string) => {
  const { data } = await api.get<ResumeVersionsResponse>(`/resume-versions?resumeId=${resumeId}`);
  return data;
};

export const getResume = async (resumeId: string) => {
  const { data } = await api.get(`/resume/${resumeId}`);
  return data;
};

export const getDownloadUrl = async (id: string, format: "pdf" | "docx" | "tex") => {
  const { data } = await api.get<DownloadResponse>(`/download/${id}?format=${format}`);
  return data;
};

export const improveResume = async (payload: {
  filePath: string;
  jobDescriptionText: string;
  addedSkill?: string;
  userProfile?: {
    name?: string;
    phone?: string;
    email?: string;
    linkedin?: string;
    github?: string;
    addedSkillExperience?: string;
  };
}) => {
  const { data } = await api.post<ImproveResumeResponse>("/improve-resume", payload);
  return data;
};

export const listUploadedResumes = async () => {
  const { data } = await api.get<UploadedResumesResponse>("/uploaded-resumes");
  return data;
};

export const deleteUploadedResume = async (filePath: string) => {
  const { data } = await api.delete<{ ok: boolean }>("/uploaded-resumes", {
    data: { filePath },
  });
  return data;
};

export const exportImprovedResume = async (payload: {
  latex: string;
  format: "pdf" | "txt" | "docx";
}) => {
  const response = await api.post<ArrayBuffer>("/export-improved-resume", payload, {
    responseType: "arraybuffer",
  });
  return {
    data: response.data,
    headers: response.headers as Record<string, string | undefined>,
  };
};
