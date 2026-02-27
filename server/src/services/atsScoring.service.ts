import { AtsAnalysis, ResumeDocument } from "../db/types";
import { extractKeywords, findMissingSkills, normalizeText } from "../utils/keywordExtractor";

const KEYWORD_WEIGHT = 0.4;
const SKILL_WEIGHT = 0.3;
const EXPERIENCE_WEIGHT = 0.2;
const FORMATTING_WEIGHT = 0.1;

const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, value));

const getKeywordMatch = (resumeText: string, jobDescription: string): number => {
  const jdKeywords = extractKeywords(jobDescription, 40);
  const resumeNormalized = normalizeText(resumeText);

  if (!jdKeywords.length) {
    return 70;
  }

  const hits = jdKeywords.filter((keyword) => resumeNormalized.includes(keyword)).length;
  return clamp(Math.round((hits / jdKeywords.length) * 100));
};

const getSkillRelevance = (resumeText: string, jobDescription: string): number => {
  const missing = findMissingSkills(resumeText, jobDescription);
  const requiredTotal = extractKeywords(jobDescription, 25).length;
  if (!requiredTotal) {
    return 70;
  }

  const matched = Math.max(requiredTotal - missing.length, 0);
  return clamp(Math.round((matched / requiredTotal) * 100));
};

const getExperienceAlignment = (resumeText: string, jobDescription: string): number => {
  const resumeNormalized = normalizeText(resumeText);
  const jdNormalized = normalizeText(jobDescription);

  const jdYears = Number(jdNormalized.match(/(\d+)\+?\s+years?/)?.[1] ?? 0);
  const resumeYears = Number(resumeNormalized.match(/(\d+)\+?\s+years?/)?.[1] ?? 0);

  let yearsScore = 65;
  if (jdYears > 0) {
    yearsScore = resumeYears >= jdYears ? 90 : clamp(Math.round((resumeYears / jdYears) * 100));
  }

  const seniorityTerms = ["senior", "lead", "principal", "manager", "staff"];
  const jdSeniorityMatches = seniorityTerms.filter((term) => jdNormalized.includes(term));
  const resumeSeniorityMatches = seniorityTerms.filter((term) => resumeNormalized.includes(term));

  const seniorityScore = jdSeniorityMatches.length
    ? clamp(Math.round((resumeSeniorityMatches.length / jdSeniorityMatches.length) * 100))
    : 75;

  return clamp(Math.round(yearsScore * 0.7 + seniorityScore * 0.3));
};

const getFormattingQuality = (resume: ResumeDocument): number => {
  const sections = resume.sections;
  const requiredSections: Array<keyof typeof sections> = ["experience", "education", "skills"];
  const present = requiredSections.filter((section) => sections[section].length > 0).length;

  const allLines = Object.values(sections).flat();
  if (!allLines.length) {
    return 0;
  }

  const bulletLines = allLines.filter((line) => /^[-*•]/.test(line)).length;
  const bulletRatio = bulletLines / allLines.length;

  const sectionCompleteness = (present / requiredSections.length) * 100;
  const bulletConsistency = clamp(Math.round(bulletRatio * 100 + 35));

  return clamp(Math.round(sectionCompleteness * 0.7 + bulletConsistency * 0.3));
};

const getInterviewChance = (score: number): AtsAnalysis["interviewChance"] => {
  if (score >= 80) {
    return "High Chance";
  }
  if (score >= 60) {
    return "Medium Chance";
  }
  return "Low Chance";
};

const buildNextSteps = (missingSkills: string[], weakSections: string[]): string[] => {
  const steps: string[] = [];

  if (missingSkills.length) {
    steps.push(`Add evidence for these skills: ${missingSkills.slice(0, 4).join(", ")}.`);
  }

  if (weakSections.includes("experience")) {
    steps.push("Rewrite experience bullets with action verbs and measurable outcomes.");
  }

  if (weakSections.includes("projects")) {
    steps.push("Add one project aligned to the target role's core technologies.");
  }

  if (!steps.length) {
    steps.push("Tailor wording to the job description and keep bullet points concise.");
  }

  return steps;
};

export const scoreResumeAgainstJob = (resume: ResumeDocument, jobDescription: string): AtsAnalysis => {
  const keywordMatch = getKeywordMatch(resume.rawText, jobDescription);
  const skillRelevance = getSkillRelevance(resume.rawText, jobDescription);
  const experienceAlignment = getExperienceAlignment(resume.rawText, jobDescription);
  const formattingQuality = getFormattingQuality(resume);

  const weighted =
    keywordMatch * KEYWORD_WEIGHT +
    skillRelevance * SKILL_WEIGHT +
    experienceAlignment * EXPERIENCE_WEIGHT +
    formattingQuality * FORMATTING_WEIGHT;

  const atsScore = clamp(Math.round(weighted));
  const missingSkills = findMissingSkills(resume.rawText, jobDescription).slice(0, 12);

  const weakSections = Object.entries(resume.sections)
    .filter(([, lines]) => lines.length < 2)
    .map(([section]) => section)
    .filter((section) => ["experience", "skills", "projects", "summary"].includes(section));

  return {
    atsScore,
    breakdown: {
      keywordMatch,
      skillRelevance,
      experienceAlignment,
      formattingQuality,
    },
    missingSkills,
    weakSections,
    interviewChance: getInterviewChance(atsScore),
    nextSteps: buildNextSteps(missingSkills, weakSections),
  };
};
