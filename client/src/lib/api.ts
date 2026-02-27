import axios from "axios";

import {
  AnalyzeResponse,
  CoverLetterResponse,
  DownloadResponse,
  InterviewResponse,
  ResumeSections,
  ResumeVersionsResponse,
  RewriteResponse,
  SkillGapResponse,
  TailorResponse,
  UploadResumeResponse,
} from "./types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000",
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
  resumeId: string;
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
