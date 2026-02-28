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

// Parser-side contract for LaTeX subheading extraction:
// \resumeSubheading{<name>}{<date>}{<org_or_degree>}{<location>}
// If incoming templates are malformed (swapped/merged args), normalizeEducationArgs
// and normalizeExperienceArgs repair them into this canonical order.

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

const isNoiseLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed) {
    return true;
  }
  if (/^[-_=|]{3,}$/.test(trimmed)) {
    return true;
  }
  if (/^[\s\-.]{4,}$/.test(trimmed)) {
    return true;
  }
  if (trimmed.length <= 2) {
    return true;
  }
  return false;
};

const cleanLine = (line: string): string => {
  return line
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .trim();
};

const splitCamelSpacing = (value: string): string => value.replace(/([a-z])([A-Z])/g, "$1 $2");

const isDateLikeToken = (value: string): boolean => {
  return /\b(19|20)\d{2}\b|\bpresent\b|\bcurrent\b|\bjan\.?\b|\bfeb\.?\b|\bmar\.?\b|\bapr\.?\b|\bmay\b|\bjun\.?\b|\bjul\.?\b|\baug\.?\b|\bsep\.?\b|\bsept\.?\b|\boct\.?\b|\bnov\.?\b|\bdec\.?\b|--| to /i.test(
    value,
  );
};

const normalizeEducationArgs = (args: string[]): {
  school: string;
  date: string;
  degree: string;
  location: string;
} => {
  const schoolRaw = cleanLine(args[0] || "");
  const second = cleanLine(args[1] || "");
  const degree = cleanLine(args[2] || "");
  const fourth = cleanLine(args[3] || "");

  const schoolDateMatch = splitCamelSpacing(schoolRaw).match(
    /^(.*?)(?:\s*)((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|(?:19|20)\d{2})$/i,
  );
  const school = schoolDateMatch?.[1]?.trim() || schoolRaw;
  const dateFromSchool = schoolDateMatch?.[2]?.trim() || "";

  const secondIsDate = isDateLikeToken(second);
  const fourthIsDate = isDateLikeToken(fourth);

  if (secondIsDate && !fourthIsDate) {
    return { school, date: second || dateFromSchool, degree, location: fourth };
  }
  if (fourthIsDate && !secondIsDate) {
    return { school, date: fourth || dateFromSchool, degree, location: second };
  }

  return {
    school,
    date: second || dateFromSchool,
    degree,
    location: fourth,
  };
};

const normalizeExperienceArgs = (args: string[]): {
  title: string;
  date: string;
  org: string;
  location: string;
} => {
  const title = cleanLine(args[0] || "");
  const date = cleanLine(args[1] || "");
  const orgRaw = cleanLine(args[2] || "");
  const locationRaw = cleanLine(args[3] || "");

  if (locationRaw) {
    return { title, date, org: orgRaw, location: locationRaw };
  }

  const merged = splitCamelSpacing(orgRaw);
  const commaIndex = merged.lastIndexOf(",");
  if (commaIndex < 0) {
    return { title, date, org: orgRaw, location: "" };
  }

  const preComma = merged.slice(0, commaIndex).trim();
  const postComma = merged.slice(commaIndex + 1).trim();
  const words = preComma.split(/\s+/).filter(Boolean);
  if (!postComma || words.length < 2) {
    return { title, date, org: orgRaw, location: "" };
  }

  const locationCity = words[words.length - 1];
  const org = words.slice(0, -1).join(" ").trim();
  const location = `${locationCity}, ${postComma}`.trim();

  return {
    title,
    date,
    org: org || orgRaw,
    location,
  };
};

const parseSectionsFromText = (text: string): ResumeSections => {
  const sections = emptySections();
  const lines = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter((line) => !isNoiseLine(line));

  let current: keyof ResumeSections = "summary";

  for (const line of lines) {
    const heading = detectHeading(line.replace(/:$/, ""));
    if (heading) {
      current = heading;
      continue;
    }

    sections[current].push(line);
  }

  return sections;
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractSectionBlock = (latex: string, sectionTitle: string): string => {
  const pattern = new RegExp(
    `\\\\section\\{${escapeRegExp(sectionTitle)}\\}([\\s\\S]*?)(?=\\n\\s*\\\\section\\{|\\n\\s*%-------------------------------------------\\n\\\\end\\{document\\}|\\n\\s*\\\\end\\{document\\})`,
    "i",
  );
  return latex.match(pattern)?.[1] ?? "";
};

interface MacroCall {
  start: number;
  end: number;
  args: string[];
}

const readBracedGroup = (source: string, start: number): { value: string; end: number } | null => {
  if (source[start] !== "{") {
    return null;
  }

  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return {
          value: source.slice(start + 1, i).replace(/\s+/g, " ").trim(),
          end: i + 1,
        };
      }
    }
  }

  return null;
};

const findMacroCalls = (source: string, macroName: string, argCount: number): MacroCall[] => {
  const calls: MacroCall[] = [];
  const marker = `\\${macroName}`;
  let cursor = 0;

  while (cursor < source.length) {
    const start = source.indexOf(marker, cursor);
    if (start < 0) {
      break;
    }

    let scan = start + marker.length;
    const args: string[] = [];
    let valid = true;

    for (let i = 0; i < argCount; i += 1) {
      while (scan < source.length && /\s/.test(source[scan])) {
        scan += 1;
      }
      const group = readBracedGroup(source, scan);
      if (!group) {
        valid = false;
        break;
      }
      args.push(group.value);
      scan = group.end;
    }

    if (valid) {
      calls.push({ start, end: scan, args });
      cursor = scan;
    } else {
      cursor = start + marker.length;
    }
  }

  return calls;
};

const parseTemplateTexSections = (latex: string): ResumeSections => {
  const uncommented = latex
    .split(/\r?\n/)
    .map((line) => line.replace(/(^|[^\\])%.*/, "$1"))
    .join("\n");

  const sections = emptySections();

  const educationBlock = extractSectionBlock(uncommented, "Education");
  const educationCalls = findMacroCalls(educationBlock, "resumeSubheading", 4);
  for (const call of educationCalls) {
    const normalized = normalizeEducationArgs(call.args);
    sections.education.push(
      `EDU::${normalized.school}||${normalized.date}||${normalized.degree}||${normalized.location}`,
    );
  }

  const experienceBlock = extractSectionBlock(uncommented, "Experience");
  const experienceCalls = findMacroCalls(experienceBlock, "resumeSubheading", 4);
  for (let i = 0; i < experienceCalls.length; i += 1) {
    const current = experienceCalls[i];
    const next = experienceCalls[i + 1];
    const normalized = normalizeExperienceArgs(current.args);
    sections.experience.push(
      `EXP_HEADER::${normalized.title}||${normalized.date}||${normalized.org}||${normalized.location}`,
    );

    const slice = experienceBlock.slice(current.end, next ? next.start : experienceBlock.length);
    const bullets = findMacroCalls(slice, "resumeItem", 1);
    for (const bullet of bullets) {
      sections.experience.push(`EXP_BULLET::${bullet.args[0]}`);
    }
  }

  const projectsBlock = extractSectionBlock(uncommented, "Projects");
  const projectCalls = findMacroCalls(projectsBlock, "resumeProjectHeading", 2);
  for (let i = 0; i < projectCalls.length; i += 1) {
    const current = projectCalls[i];
    const next = projectCalls[i + 1];
    sections.projects.push(`PRJ_HEADER::${current.args[0]}||${current.args[1]}`);

    const slice = projectsBlock.slice(current.end, next ? next.start : projectsBlock.length);
    const bullets = findMacroCalls(slice, "resumeItem", 1);
    for (const bullet of bullets) {
      sections.projects.push(`PRJ_BULLET::${bullet.args[0]}`);
    }
  }

  const skillsBlock = extractSectionBlock(uncommented, "Technical Skills");
  const skillRows = [...skillsBlock.matchAll(/\\textbf\{([^}]*)\}\{: ([^}]*)\}/g)];
  for (const row of skillRows) {
    const label = cleanLine(row[1]);
    const value = cleanLine(row[2]);
    if (label && value) {
      sections.skills.push(`SKILL::${label}||${value}`);
    }
  }

  return sections;
};

const hasStructuredContent = (sections: ResumeSections): boolean => {
  return Object.values(sections).some((items) => items.length > 0);
};

const humanizeTokenLine = (line: string): string => {
  const tokenToText = (prefix: string): string[] | null => {
    if (!line.startsWith(prefix)) {
      return null;
    }
    return line
      .slice(prefix.length)
      .split("||")
      .map((part) =>
        cleanLine(
          part
            .replace(/\\textbf\{([^}]*)\}/g, "$1")
            .replace(/\\emph\{([^}]*)\}/g, "$1")
            .replace(/\\&/g, "&"),
        ),
      )
      .filter(Boolean);
  };

  const edu = tokenToText("EDU::");
  if (edu) {
    return [edu[0], edu[2], edu[1], edu[3]].filter(Boolean).join(" | ");
  }

  const expHeader = tokenToText("EXP_HEADER::");
  if (expHeader) {
    return [expHeader[0], expHeader[1], expHeader[2], expHeader[3]].filter(Boolean).join(" | ");
  }

  const expBullet = tokenToText("EXP_BULLET::");
  if (expBullet) {
    return expBullet[0] ?? "";
  }

  const prjHeader = tokenToText("PRJ_HEADER::");
  if (prjHeader) {
    return [prjHeader[0], prjHeader[1]].filter(Boolean).join(" | ");
  }

  const prjBullet = tokenToText("PRJ_BULLET::");
  if (prjBullet) {
    return prjBullet[0] ?? "";
  }

  const skill = tokenToText("SKILL::");
  if (skill) {
    return `${skill[0] || "Skills"}: ${skill[1] || ""}`.trim();
  }

  return line;
};

export const toDisplaySections = (sections: ResumeSections): ResumeSections => {
  return {
    summary: sections.summary.map(humanizeTokenLine).filter(Boolean),
    experience: sections.experience.map(humanizeTokenLine).filter(Boolean),
    education: sections.education.map(humanizeTokenLine).filter(Boolean),
    skills: sections.skills.map(humanizeTokenLine).filter(Boolean),
    projects: sections.projects.map(humanizeTokenLine).filter(Boolean),
    certifications: sections.certifications.map(humanizeTokenLine).filter(Boolean),
    other: sections.other.map(humanizeTokenLine).filter(Boolean),
  };
};

const parseByExtension = async (
  buffer: Buffer,
  fileName: string,
): Promise<{ text: string; structured?: ResumeSections }> => {
  const extension = path.extname(fileName).toLowerCase();

  if (extension === ".pdf") {
    return { text: await parsePdfBuffer(buffer) };
  }

  if (extension === ".docx") {
    return { text: await parseDocxBuffer(buffer) };
  }

  if (extension === ".tex") {
    const latexSource = buffer.toString("utf-8");
    const structured = parseTemplateTexSections(latexSource);
    const text = await parseTexBuffer(buffer);
    return { text, structured: hasStructuredContent(structured) ? structured : undefined };
  }

  throw new ApiError(400, "Unsupported resume format");
};

export const parseResumeFile = async (buffer: Buffer, fileName: string): Promise<ResumeDocument> => {
  const parsed = await parseByExtension(buffer, fileName);
  const text = parsed.text;
  const normalizedText = text.trim();

  if (!normalizedText) {
    throw new ApiError(400, "Resume parser returned empty text");
  }

  return {
    rawText: normalizedText,
    sections: parsed.structured ?? parseSectionsFromText(normalizedText),
    extractedKeywords: extractKeywords(normalizedText),
  };
};
