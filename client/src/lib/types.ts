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
  resumeId: string;
  parsedSections: ResumeSections;
  warnings: string[];
}

export interface AtsBreakdown {
  keywordMatch: number;
  skillRelevance: number;
  experienceAlignment: number;
  formattingQuality: number;
}

export interface AnalyzeResponse {
  analysisId: string;
  versionId: string;
  atsScore: number;
  breakdown: AtsBreakdown;
  missingSkills: string[];
  weakSections: string[];
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
