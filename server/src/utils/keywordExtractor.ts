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

export const findMissingSkills = (resumeText: string, jobDescription: string): string[] => {
  const resumeNormalized = normalizeText(resumeText);
  const jobNormalized = normalizeText(jobDescription);

  const requiredSkills = SKILL_DICTIONARY.filter((skill) => jobNormalized.includes(skill));
  return requiredSkills.filter((skill) => !resumeNormalized.includes(skill));
};
