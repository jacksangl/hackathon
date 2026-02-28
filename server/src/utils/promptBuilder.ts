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

export const buildImproveLatexPrompt = (params: {
  templateLatex: string;
  resume: ResumeDocument;
  jobDescription: string;
  addedSkill: string;
  addedSkillExperience?: string;
}): string => {
  return `You are editing a LaTeX resume.
Return STRICT JSON only with shape:
{
  "improvedLatex": "...",
  "changeSummary": ["..."]
}

Rules:
- Keep the LaTeX format/structure/commands exactly the same.
- Do not remove sections.
- Keep each role/project header to a maximum of 3-4 bullet points.
- Keep education details grouped correctly (for example GPA must stay within the same education entry, not as a separate education entry).
- Preserve header/date argument structure exactly:
  - \\resumeSubheading{<name>}{<date>}{<org>}{<location>}
  - \\resumeProjectHeading{<name>}{<date>}
  - Do not swap name/date positions.
  - Correct examples:
    - \\resumeSubheading{The Pennsylvania State University}{May. 2027}{Bachelor of Science in Computer Science}{University Park, PA}
    - \\resumeSubheading{Software Engineer Intern}{May 2026 -- Aug 2026}{Lockheed Martin}{Dallas, Texas}
- Keep the updated resume constrained to one page in the provided template.
- Improve bullet wording across the entire resume for ATS quality.
- Incorporate the added skill "${params.addedSkill}" in a truthful way.
- If added skill experience is "${params.addedSkillExperience ?? ""}" and equals "No experience", do not fabricate experience bullets.
- Preserve valid LaTeX syntax.

Resume context:
Summary: ${params.resume.sections.summary.join(" | ")}
Experience: ${params.resume.sections.experience.join(" | ")}
Skills: ${params.resume.sections.skills.join(" | ")}
Projects: ${params.resume.sections.projects.join(" | ")}

Job description:
${params.jobDescription}

Template latex:
${params.templateLatex}`;
};
