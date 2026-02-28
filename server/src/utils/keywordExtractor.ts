const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "with",
  "you",
  "your",
  "we",
  "our",
  "will",
  "this",
  "their",
  "have",
  "has",
  "who",
  "can",
  "must",
  "should",
]);

const GENERIC_JOB_TERMS = new Set([
  "team",
  "role",
  "work",
  "working",
  "ability",
  "candidate",
  "position",
  "company",
  "required",
  "requirements",
  "qualification",
  "qualifications",
  "responsibilities",
  "responsibility",
  "preferred",
  "plus",
  "strong",
  "excellent",
  "good",
  "experience",
  "years",
  "year",
  "building",
  "developing",
  "development",
  "solutions",
  "products",
  "systems",
  "tools",
  "knowledge",
  "understanding",
  "environment",
  "process",
  "processes",
  "across",
  "multiple",
  "including",
  "full-time",
  "part-time",
  "intern",
  "internship",
  "bonus",
  "benefits",
  "stipend",
  "culture",
  "customers",
  "please",
  "apply",
  "join",
  "build",
  "building",
  "deploying",
  "deploy",
  "frontier",
  "humanity",
  "responsible",
  "responsibilities",
  "capabilities",
  "hard",
]);

export const SKILL_DICTIONARY = [
  "react",
  "typescript",
  "javascript",
  "node",
  "express",
  "rest api",
  "graphql",
  "postgresql",
  "sql",
  "supabase",
  "aws",
  "docker",
  "kubernetes",
  "python",
  "java",
  "c++",
  "git",
  "ci/cd",
  "testing",
  "jest",
  "vitest",
  "tailwind",
  "next.js",
  "microservices",
  "system design",
  "machine learning",
  "data analysis",
  "agile",
  "scrum",
  "leadership",
  "communication",
];

export const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s+.#/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const extractKeywords = (text: string, max = 30): string[] => {
  const normalized = normalizeText(text);
  const words = normalized.split(" ").filter((token) => token.length > 2 && !STOPWORDS.has(token));

  const counts = new Map<string, number>();
  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  const ranked = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([word]) => word);

  const dictionaryMatches = SKILL_DICTIONARY.filter((skill) => normalized.includes(skill));
  const combined = [...new Set([...dictionaryMatches, ...ranked])];

  return combined.slice(0, max);
};

const REQUIREMENT_HINT_REGEX =
  /\b(skills?|requirements?|qualifications?|must have|experience with|proficient in|knowledge of|familiar with|expertise in|tech stack|technologies?)\b/i;

const normalizeCandidate = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9+.#/-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const looksLikeSkillPhrase = (value: string): boolean => {
  if (!value || value.length < 2 || value.length > 30) {
    return false;
  }

  const words = value.split(" ").filter(Boolean);
  if (!words.length || words.length > 3) {
    return false;
  }

  if (words.every((word) => STOPWORDS.has(word) || GENERIC_JOB_TERMS.has(word))) {
    return false;
  }

  if (GENERIC_JOB_TERMS.has(value)) {
    return false;
  }

  return true;
};

const extractSkillPhrasesFromRequirementLines = (jobDescription: string): string[] => {
  const phrases: string[] = [];

  const lines = jobDescription
    .split(/\r?\n|[.;](?=\s|$)/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (!REQUIREMENT_HINT_REGEX.test(line)) {
      continue;
    }

    const segments = line
      .replace(/[()]/g, ",")
      .split(/,|\/|\||\band\b/gi)
      .map((part) => normalizeCandidate(part))
      .filter(Boolean);

    for (const segment of segments) {
      const trimmed = segment.replace(
        /\b(skills?|requirements?|qualifications?|must have|experience with|proficient in|knowledge of|familiar with|expertise in|tech stack|technologies?|required|preferred)\b/gi,
        "",
      );

      const candidate = normalizeCandidate(trimmed);
      if (looksLikeSkillPhrase(candidate)) {
        phrases.push(candidate);
      }
    }
  }

  return phrases;
};

export const getRequiredSkillCandidates = (jobDescription: string, max = 60): string[] => {
  const normalized = normalizeText(jobDescription);
  const dictionaryMatches = SKILL_DICTIONARY.filter((skill) => normalized.includes(skill));
  const phraseCandidates = extractSkillPhrasesFromRequirementLines(jobDescription);
  const mappedFromPhrases = phraseCandidates
    .map((candidate) => {
      const exact = SKILL_DICTIONARY.find((skill) => candidate === skill);
      if (exact) {
        return exact;
      }

      const contains = SKILL_DICTIONARY.find((skill) => candidate.includes(skill));
      if (contains) {
        return contains;
      }

      return SKILL_DICTIONARY.find((skill) => skill.includes(candidate));
    })
    .filter((value): value is string => Boolean(value));

  return [...new Set([...dictionaryMatches, ...mappedFromPhrases])].slice(0, max);
};

export const findMissingSkills = (resumeText: string, jobDescription: string): string[] => {
  const resumeNormalized = normalizeText(resumeText);
  const requiredSkills = getRequiredSkillCandidates(jobDescription, 80);
  return requiredSkills.filter((skill) => !resumeNormalized.includes(skill));
};
