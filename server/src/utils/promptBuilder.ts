import { ResumeDocument } from "../db/types";

const toResumeText = (resume: ResumeDocument): string => {
  return [
    `Summary: ${resume.sections.summary.join(" | ")}`,
    `Experience: ${resume.sections.experience.join(" | ")}`,
    `Education: ${resume.sections.education.join(" | ")}`,
    `Skills: ${resume.sections.skills.join(" | ")}`,
    `Projects: ${resume.sections.projects.join(" | ")}`,
    `Certifications: ${resume.sections.certifications.join(" | ")}`,
    `Other: ${resume.sections.other.join(" | ")}`,
  ].join("\n");
};

export const buildAnalyzePrompt = (
  resume: ResumeDocument,
  jobDescription: string,
  scoring: {
    atsScore: number;
    missingSkills: string[];
    weakSections: string[];
  },
): string => {
  return `You are a resume optimization assistant.
Return STRICT JSON only. No markdown.

Input Resume:
${toResumeText(resume)}

Job Description:
${jobDescription}

Scoring Context:
ATS Score: ${scoring.atsScore}
Missing Skills: ${scoring.missingSkills.join(", ") || "None"}
Weak Sections: ${scoring.weakSections.join(", ") || "None"}

Return JSON with this shape:
{
  "feedback": ["..."],
  "sectionRecommendations": {
    "experience": ["..."],
    "skills": ["..."],
    "projects": ["..."]
  },
  "missingKeywords": ["..."],
  "coverLetterStarter": "...",
  "interviewQuestionsStarter": {
    "behavioral": [{"question":"...","keyPoints":["..."]}],
    "technical": [{"question":"...","keyPoints":["..."]}]
  },
  "skillGapStarter": {
    "missingSkills": ["..."],
    "skillsToLearn": ["..."],
    "projectIdeas": ["..."],
    "technologiesToStudy": ["..."]
  }
}`;
};

export const buildRewritePrompt = (params: {
  section: string;
  text: string;
  jobDescription: string;
  mode: "inline" | "full";
}): string => {
  return `You improve resume writing for ATS.
Return STRICT JSON only.

Section: ${params.section}
Mode: ${params.mode}
Original text:
${params.text}

Job Description:
${params.jobDescription}

Return JSON:
{
  "rewrittenText": "...",
  "suggestions": ["..."],
  "keywordsUsed": ["..."]
}`;
};

export const buildTailorPrompt = (resume: ResumeDocument, jobDescription: string): string => {
  return `Tailor this resume for the job description while preserving truthful content.
Return STRICT JSON only.

Resume:
${toResumeText(resume)}

Job Description:
${jobDescription}

Return JSON:
{
  "tailoredResume": {
    "summary": ["..."],
    "experience": ["..."],
    "education": ["..."],
    "skills": ["..."],
    "projects": ["..."],
    "certifications": ["..."],
    "other": ["..."]
  },
  "improvementReason": "..."
}`;
};

export const buildCoverLetterPrompt = (resume: ResumeDocument, jobDescription: string, tone: string): string => {
  return `Write a concise personalized cover letter.
Tone: ${tone}
Return STRICT JSON only with shape {"content":"..."}.

Resume:
${toResumeText(resume)}

Job Description:
${jobDescription}`;
};

export const buildInterviewPrompt = (resume: ResumeDocument, jobDescription: string): string => {
  return `Generate mock interview questions.
Return STRICT JSON only.
Shape:
{
  "behavioral":[{"question":"...","keyPoints":["..."]}],
  "technical":[{"question":"...","keyPoints":["..."]}]
}

Resume:
${toResumeText(resume)}

Job Description:
${jobDescription}`;
};

export const buildSkillGapPrompt = (resume: ResumeDocument, jobDescription: string): string => {
  return `Find practical skill gaps between resume and job description.
Return STRICT JSON only.
Shape:
{
  "missingSkills": ["..."],
  "skillsToLearn": ["..."],
  "projectIdeas": ["..."],
  "technologiesToStudy": ["..."]
}

Resume:
${toResumeText(resume)}

Job Description:
${jobDescription}`;
};
