import path from "node:path";

import { ResumeDocument, ResumeSections } from "../db/types";
import { parseDocxBuffer } from "../utils/docxParser";
import { ApiError } from "../utils/errors";
import { extractKeywords } from "../utils/keywordExtractor";
import { parsePdfBuffer } from "../utils/pdfParser";
import { parseTexBuffer } from "../utils/texParser";

const emptySections = (): ResumeSections => ({
  summary: [],
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  other: [],
});

const headingMap: Array<{ aliases: string[]; key: keyof ResumeSections }> = [
  { aliases: ["summary", "profile", "about"], key: "summary" },
  { aliases: ["experience", "work history", "employment"], key: "experience" },
  { aliases: ["education", "academic"], key: "education" },
  { aliases: ["skills", "technical skills", "core skills"], key: "skills" },
  { aliases: ["projects", "project experience"], key: "projects" },
  { aliases: ["certifications", "certificates"], key: "certifications" },
];

const detectHeading = (line: string): keyof ResumeSections | null => {
  const clean = line.toLowerCase().replace(/[^a-z\s]/g, " ").trim();
  for (const entry of headingMap) {
    if (entry.aliases.some((alias) => clean === alias || clean.startsWith(alias))) {
      return entry.key;
    }
  }
  return null;
};

const parseSectionsFromText = (text: string): ResumeSections => {
  const sections = emptySections();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let current: keyof ResumeSections = "summary";

  for (const line of lines) {
    const heading = detectHeading(line.replace(/:$/, ""));
    if (heading) {
      current = heading;
      continue;
    }

    if (line.length < 2) {
      continue;
    }

    sections[current].push(line);
  }

  return sections;
};

const parseByExtension = async (buffer: Buffer, fileName: string): Promise<string> => {
  const extension = path.extname(fileName).toLowerCase();

  if (extension === ".pdf") {
    return parsePdfBuffer(buffer);
  }

  if (extension === ".docx") {
    return parseDocxBuffer(buffer);
  }

  if (extension === ".tex") {
    return parseTexBuffer(buffer);
  }

  throw new ApiError(400, "Unsupported resume format");
};

export const parseResumeFile = async (buffer: Buffer, fileName: string): Promise<ResumeDocument> => {
  const text = await parseByExtension(buffer, fileName);
  const normalizedText = text.trim();

  if (!normalizedText) {
    throw new ApiError(400, "Resume parser returned empty text");
  }

  return {
    rawText: normalizedText,
    sections: parseSectionsFromText(normalizedText),
    extractedKeywords: extractKeywords(normalizedText),
  };
};
