import { AtsAnalysis, ResumeDocument } from "../db/types";
import {
  extractKeywords,
  findMissingSkills,
  getRequiredSkillCandidates,
  normalizeText,
} from "../utils/keywordExtractor";

const KEYWORD_WEIGHT = 0.4;
const SKILL_WEIGHT = 0.3;
const EXPERIENCE_WEIGHT = 0.2;
const FORMATTING_WEIGHT = 0.1;

const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, value));

const QUALIFICATION_MARKERS =
  /\b(required|requirements|must|minimum|at least|need|needs|qualification|qualifications|degree|years|experience|graduate|graduation|eligible)\b/i;

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
  const requiredTotal = getRequiredSkillCandidates(jobDescription, 80).length;
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

const splitRequirementClauses = (jobDescription: string): string[] => {
  return jobDescription
    .split(/\r?\n|[.;](?=\s|$)/)
    .map((line) => line.replace(/^[\s\-*•]+/, "").trim())
    .filter((line) => line.length > 8 && QUALIFICATION_MARKERS.test(line));
};

const qualificationKeywords = (requirement: string): string[] => {
  const ignored = new Set([
    "required",
    "requirements",
    "must",
    "minimum",
    "years",
    "year",
    "experience",
    "preferred",
    "qualification",
    "qualifications",
    "graduate",
    "graduation",
  ]);

  return extractKeywords(requirement, 16).filter((keyword) => !ignored.has(keyword));
};

const hasRequirementEvidence = (resumeNormalized: string, requirement: string): boolean => {
  const reqKeywords = qualificationKeywords(requirement);
  if (!reqKeywords.length) {
    return true;
  }

  const matched = reqKeywords.filter((keyword) => resumeNormalized.includes(keyword)).length;
  const coverage = matched / reqKeywords.length;

  return coverage >= 0.55;
};

const getMissingQualifications = (resumeText: string, jobDescription: string): string[] => {
  const resumeNormalized = normalizeText(resumeText);
  const requirements = splitRequirementClauses(jobDescription);

  const missing = requirements.filter((requirement) => !hasRequirementEvidence(resumeNormalized, requirement));
  return [...new Set(missing)];
};

const extractAllYears = (text: string): number[] => {
  return [...text.matchAll(/\b(19|20)\d{2}\b/g)].map((match) => Number(match[0]));
};

const extractYearsExperience = (text: string): number => {
  const values = [...text.matchAll(/\b(\d+)\+?\s+years?\b/gi)].map((match) => Number(match[1]));
  if (!values.length) {
    return 0;
  }
  return Math.max(...values);
};

const getExplicitDisqualifiers = (resume: ResumeDocument, jobDescription: string): string[] => {
  const disqualifiers: string[] = [];
  const jdNormalized = normalizeText(jobDescription);
  const resumeNormalized = normalizeText(resume.rawText);

  const jdYearsRequired = extractYearsExperience(jobDescription);
  const resumeYears = extractYearsExperience(resume.rawText);
  if (jdYearsRequired > 0 && resumeYears > 0 && resumeYears < jdYearsRequired) {
    disqualifiers.push(
      `Role asks for ${jdYearsRequired}+ years of experience, but resume shows about ${resumeYears} years.`,
    );
  }

  if (jdYearsRequired > 0 && resumeYears === 0) {
    disqualifiers.push(
      `Role asks for ${jdYearsRequired}+ years of experience, but years of experience are not clearly stated in the resume.`,
    );
  }

  const bachelorsRequired =
    /\b(bachelor'?s|b\.?s\.?|ba)\b/.test(jdNormalized) &&
    /\b(required|must|minimum|need)\b/.test(jdNormalized);
  if (
    bachelorsRequired &&
    !/\b(bachelor|b\.?s\.?|ba|undergraduate)\b/.test(resumeNormalized)
  ) {
    disqualifiers.push("Job requires a bachelor's degree, but resume does not show one.");
  }

  const mastersRequired =
    /\b(master'?s|m\.?s\.?|mba)\b/.test(jdNormalized) &&
    /\b(required|must|minimum|need)\b/.test(jdNormalized);
  if (mastersRequired && !/\b(master|m\.?s\.?|mba)\b/.test(resumeNormalized)) {
    disqualifiers.push("Job requires a master's degree, but resume does not show one.");
  }

  const graduationClauses = splitRequirementClauses(jobDescription).filter((line) =>
    /\b(graduate|graduation|class of|degree by)\b/i.test(line),
  );

  if (graduationClauses.length) {
    const resumeYearsList = extractAllYears(resume.sections.education.join(" ") || resume.rawText);
    const resumeLatestGradYear = resumeYearsList.length ? Math.max(...resumeYearsList) : null;

    for (const clause of graduationClauses) {
      const years = extractAllYears(clause);
      if (!years.length) {
        continue;
      }

      if (resumeLatestGradYear === null) {
        disqualifiers.push(
          `Job has explicit graduation-date requirement (${clause}), but resume has no clear graduation year.`,
        );
        continue;
      }

      if (years.length >= 2) {
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        if (resumeLatestGradYear < minYear || resumeLatestGradYear > maxYear) {
          disqualifiers.push(
            `Job requires graduation between ${minYear}-${maxYear}, but resume shows ${resumeLatestGradYear}.`,
          );
        }
        continue;
      }

      const year = years[0];
      if (/\b(or later|after|no earlier than|at least)\b/i.test(clause)) {
        if (resumeLatestGradYear < year) {
          disqualifiers.push(
            `Job requires graduation year ${year} or later, but resume shows ${resumeLatestGradYear}.`,
          );
        }
      } else if (/\b(or earlier|before|no later than|at most)\b/i.test(clause)) {
        if (resumeLatestGradYear > year) {
          disqualifiers.push(
            `Job requires graduation year ${year} or earlier, but resume shows ${resumeLatestGradYear}.`,
          );
        }
      } else if (resumeLatestGradYear !== year) {
        disqualifiers.push(
          `Job requires graduation year ${year}, but resume shows ${resumeLatestGradYear}.`,
        );
      }
    }
  }

  return [...new Set(disqualifiers)];
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

const buildNextSteps = (
  missingSkills: string[],
  missingQualifications: string[],
  weakSections: string[],
  disqualifiers: string[],
): string[] => {
  const steps: string[] = [];

  if (disqualifiers.length) {
    steps.push(
      `Hard requirement mismatch detected. Address eligibility gaps first: ${disqualifiers.slice(0, 2).join(" ")}`,
    );
  }

  if (missingSkills.length) {
    steps.push(`Add evidence for these skills: ${missingSkills.slice(0, 8).join(", ")}.`);
  }

  if (missingQualifications.length) {
    steps.push(
      `Address these missing qualifications from the job description: ${missingQualifications.slice(0, 3).join(" | ")}.`,
    );
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
  const missingSkills = findMissingSkills(resume.rawText, jobDescription);
  const missingQualifications = getMissingQualifications(resume.rawText, jobDescription);
  const disqualifiers = getExplicitDisqualifiers(resume, jobDescription);
  const fitVerdict: AtsAnalysis["fitVerdict"] = disqualifiers.length ? "not_fit" : "fit";

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
    missingQualifications,
    weakSections,
    fitVerdict,
    disqualifiers,
    interviewChance: getInterviewChance(atsScore),
    nextSteps: buildNextSteps(missingSkills, missingQualifications, weakSections, disqualifiers),
  };
};
