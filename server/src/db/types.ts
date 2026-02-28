export type ResumeSectionName =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "other";

export interface ResumeSections {
  summary: string[];
  experience: string[];
  education: string[];
  skills: string[];
  projects: string[];
  certifications: string[];
  other: string[];
}

export interface ResumeDocument {
  rawText: string;
  sections: ResumeSections;
  extractedKeywords: string[];
}

export interface AtsBreakdown {
  keywordMatch: number;
  skillRelevance: number;
  experienceAlignment: number;
  formattingQuality: number;
}

export interface AtsAnalysis {
  atsScore: number;
  breakdown: AtsBreakdown;
  missingSkills: string[];
  missingQualifications: string[];
  weakSections: string[];
  fitVerdict: "fit" | "not_fit";
  disqualifiers: string[];
  interviewChance: "High Chance" | "Medium Chance" | "Low Chance";
  nextSteps: string[];
}

export interface AiAnalyzeOutput {
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

export interface RewriteOutput {
  rewrittenText: string;
  suggestions: string[];
  keywordsUsed: string[];
}

export interface TailorOutput {
  tailoredResume: ResumeDocument;
  improvementReason: string;
}

export interface CoverLetterOutput {
  content: string;
}

export interface InterviewOutput {
  behavioral: Array<{ question: string; keyPoints: string[] }>;
  technical: Array<{ question: string; keyPoints: string[] }>;
}

export interface SkillGapOutput {
  missingSkills: string[];
  skillsToLearn: string[];
  projectIdeas: string[];
  technologiesToStudy: string[];
}

export interface ImproveLatexOutput {
  improvedLatex: string;
  changeSummary: string[];
}
