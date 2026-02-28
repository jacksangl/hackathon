export interface ResumeSections {
  summary: string[];
  experience: string[];
  education: string[];
  skills: string[];
  projects: string[];
  certifications: string[];
  other: string[];
}

export interface UploadResumeResponse {
  uploadId: string;
  filePath: string;
  filename: string;
  size: number;
  mimeType: string;
  warnings: string[];
}

export interface AtsBreakdown {
  keywordMatch: number;
  skillRelevance: number;
  experienceAlignment: number;
  formattingQuality: number;
}

export interface AnalyzeResponse {
  resumeSections: ResumeSections;
  atsScore: number;
  breakdown: AtsBreakdown;
  missingSkills: string[];
  missingQualifications: string[];
  weakSections: string[];
  fitVerdict: "fit" | "not_fit";
  disqualifiers: string[];
  interviewChance: "High Chance" | "Medium Chance" | "Low Chance";
  nextSteps: string[];
  feedback: string[];
  sectionRecommendations: Record<string, string[]>;
  missingKeywords: string[];
  coverLetterStarter: string;
  interviewQuestionsStarter: {
    behavioral: Array<{ question: string; keyPoints: string[] }>;
    technical: Array<{ question: string; keyPoints: string[] }>;
  };
  skillGapStarter: {
    missingSkills: string[];
    skillsToLearn: string[];
    projectIdeas: string[];
    technologiesToStudy: string[];
  };
}

export interface RewriteResponse {
  rewrittenText: string;
  suggestions: string[];
  keywordsUsed: string[];
}

export interface TailorResponse {
  versionId: string;
  atsScore: number;
  improvementReason: string;
  breakdown: AtsBreakdown;
}

export interface CoverLetterResponse {
  artifactId: string;
  content: string;
}

export interface InterviewResponse {
  behavioral: Array<{ question: string; keyPoints: string[] }>;
  technical: Array<{ question: string; keyPoints: string[] }>;
}

export interface SkillGapResponse {
  missingSkills: string[];
  skillsToLearn: string[];
  projectIdeas: string[];
  technologiesToStudy: string[];
}

export interface ResumeVersion {
  id: string;
  label: string;
  ats_score: number;
  improvement_reason: string;
  created_at: string;
}

export interface ResumeVersionsResponse {
  versions: ResumeVersion[];
  progression: Array<{
    versionId: string;
    label: string;
    atsScore: number;
    createdAt: string;
    improvementReason: string;
  }>;
}

export interface DownloadResponse {
  type: "resume_version" | "artifact";
  id: string;
  format: "pdf" | "docx" | "tex";
  downloadUrl: string;
}

export interface ImproveResumeResponse {
  needsInput: boolean;
  missingFields?: Array<{
    key: "name" | "phone" | "email" | "linkedin" | "github" | "addedSkillExperience";
    label: string;
    hint: string;
  }>;
  defaults?: {
    name?: string;
    phone?: string;
    email?: string;
    linkedin?: string;
    github?: string;
    addedSkillExperience?: string;
  };
  message?: string;
  improvedLatex?: string;
  changeSummary?: string[];
  appliedSkill?: string;
  appliedProfile?: {
    name: string;
    phone: string;
    email: string;
    linkedin: string;
    github: string;
    addedSkillExperience?: string;
  };
}

export interface UploadedResumeDocument {
  filePath: string;
  filename: string;
  size: number | null;
  mimeType: string | null;
  updatedAt: string | null;
  createdAt: string | null;
}

export interface UploadedResumesResponse {
  documents: UploadedResumeDocument[];
}
