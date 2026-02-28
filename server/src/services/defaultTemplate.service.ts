import fs from "node:fs/promises";
import path from "node:path";
import { ResumeDocument } from "../db/types";

const DEFAULT_NAME = "Jake Ryan";
const DEFAULT_PHONE = "123-456-7890";
const DEFAULT_EMAIL = "jake@su.edu";
const DEFAULT_LINKEDIN = "linkedin.com/in/jake";
const DEFAULT_GITHUB = "github.com/jake";

const templatePaths = () => ({
  user: path.join(process.cwd(), "templates", "user-resume-template.tex"),
  default: path.join(process.cwd(), "templates", "default-resume-template.tex"),
});

export interface ProfileOverrides {
  name?: string;
  phone?: string;
  email?: string;
  linkedin?: string;
  github?: string;
  addedSkillExperience?: string;
}

export interface ResolvedProfile {
  name: string;
  phone: string;
  email: string;
  linkedin: string;
  github: string;
  addedSkillExperience?: string;
}

export interface MissingField {
  key: keyof ProfileOverrides;
  label: string;
  hint: string;
}

export const loadDefaultResumeTemplate = async (): Promise<string> => {
  const paths = templatePaths();
  try {
    await fs.access(paths.user);
    return fs.readFile(paths.user, "utf-8");
  } catch {
    return fs.readFile(paths.default, "utf-8");
  }
};

const extractByRegex = (source: string, regex: RegExp, fallback: string): string => {
  const value = source.match(regex)?.[1]?.trim();
  return value || fallback;
};

export const extractProfileFromTemplate = (latex: string): ResolvedProfile => {
  const name = extractByRegex(latex, /\\textbf\{\\Huge \\scshape ([^}]*)\}/, DEFAULT_NAME);
  const phone = extractByRegex(latex, /\\small ([^$]*) \$\|\$/, DEFAULT_PHONE);
  const email = extractByRegex(latex, /\\underline\{([^}]*)\}\} \$\|\$\s*\\href\{https:\/\/linkedin/, DEFAULT_EMAIL);
  const linkedin = extractByRegex(latex, /\\underline\{(linkedin\.com\/in\/[^}]*)\}/, DEFAULT_LINKEDIN);
  const github = extractByRegex(latex, /\\underline\{(github\.com\/[^}]*)\}/, DEFAULT_GITHUB);

  return {
    name,
    phone,
    email,
    linkedin,
    github,
  };
};

export const extractProfileFromResumeText = (resumeText: string): Partial<ResolvedProfile> => {
  const lines = resumeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const email = resumeText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = resumeText.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0];
  const linkedin = resumeText.match(/(?:https?:\/\/)?(linkedin\.com\/in\/[A-Za-z0-9\-_/]+)/i)?.[1];
  const github = resumeText.match(/(?:https?:\/\/)?(github\.com\/[A-Za-z0-9\-_.]+)/i)?.[1];

  const name = lines.find((line) => {
    if (line.length < 3 || line.length > 70) {
      return false;
    }
    if (/@|linkedin\.com|github\.com|http|\d/.test(line.toLowerCase())) {
      return false;
    }
    const words = line.split(/\s+/);
    if (words.length > 5) {
      return false;
    }
    return words.some((word) => /^[A-Z][a-z'-]+$/.test(word));
  });

  return {
    name,
    phone,
    email,
    linkedin,
    github,
  };
};

const isPlaceholder = (value: string, placeholder: string): boolean => {
  const normalized = value.trim().toLowerCase();
  return !normalized || normalized === placeholder.toLowerCase();
};

export const resolveProfileAndMissing = (params: {
  extractedProfile: ResolvedProfile;
  overrides?: ProfileOverrides;
  addedSkill: string;
  resumeText: string;
}) => {
  const overrides = params.overrides ?? {};

  const resolved: ResolvedProfile = {
    name: overrides.name?.trim() || params.extractedProfile.name,
    phone: overrides.phone?.trim() || params.extractedProfile.phone,
    email: overrides.email?.trim() || params.extractedProfile.email,
    linkedin: overrides.linkedin?.trim() || params.extractedProfile.linkedin,
    github: overrides.github?.trim() || params.extractedProfile.github,
    addedSkillExperience: overrides.addedSkillExperience?.trim(),
  };

  const missingFields: MissingField[] = [];

  if (isPlaceholder(resolved.name, DEFAULT_NAME)) {
    missingFields.push({
      key: "name",
      label: "Full Name",
      hint: "Enter your full legal/professional name.",
    });
  }

  if (isPlaceholder(resolved.phone, DEFAULT_PHONE)) {
    missingFields.push({
      key: "phone",
      label: "Phone Number",
      hint: "Enter your preferred contact number.",
    });
  }

  if (isPlaceholder(resolved.email, DEFAULT_EMAIL)) {
    missingFields.push({
      key: "email",
      label: "Email",
      hint: "Enter your email for recruiters.",
    });
  }

  if (isPlaceholder(resolved.linkedin, DEFAULT_LINKEDIN)) {
    missingFields.push({
      key: "linkedin",
      label: "LinkedIn URL",
      hint: "Use format linkedin.com/in/your-handle",
    });
  }

  if (isPlaceholder(resolved.github, DEFAULT_GITHUB)) {
    missingFields.push({
      key: "github",
      label: "GitHub URL",
      hint: "Use format github.com/your-handle",
    });
  }

  const hasSkillEvidence = params.resumeText.toLowerCase().includes(params.addedSkill.toLowerCase());
  if (!hasSkillEvidence && !resolved.addedSkillExperience) {
    missingFields.push({
      key: "addedSkillExperience",
      label: `Experience with ${params.addedSkill}`,
      hint: "Add a short bullet-style summary, or type 'No experience'.",
    });
  }

  return {
    resolved,
    missingFields,
  };
};

const ensureHttpsPrefix = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const escapeLatex = (value: string): string => {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalized
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
};

const normalizeBulletLine = (line: string): string => line.replace(/^[-*•]\s*/, "").trim();

const pickHeadingText = (line: string, fallback: string): string => {
  const first = normalizeBulletLine(line).split(/[,-|]/)[0]?.trim();
  return first && first.length > 2 ? first : fallback;
};

const replaceSectionBlock = (latex: string, sectionTitle: string, content: string): string => {
  const titleRegex = escapeRegExp(sectionTitle);
  const pattern = new RegExp(
    `\\\\section\\{${titleRegex}\\}[\\s\\S]*?(?=\\n\\s*\\\\section\\{|\\n\\s*%-------------------------------------------\\n\\\\end\\{document\\})`,
  );

  if (!pattern.test(latex)) {
    return latex;
  }

  return latex.replace(pattern, content);
};

const MAX_BULLETS_PER_HEADER = 4;
const MAX_EDUCATION_HEADERS = 3;
const MAX_EXPERIENCE_HEADERS = 4;
const MAX_PROJECT_HEADERS = 3;

const dedupeKeepOrder = (items: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const normalized = item.trim();
    if (!normalized || seen.has(normalized.toLowerCase())) {
      continue;
    }
    seen.add(normalized.toLowerCase());
    out.push(normalized);
  }
  return out;
};

const decodeLatexText = (value: string): string => {
  return value
    .replace(/\\textbf\{([^}]*)\}/g, "$1")
    .replace(/\\emph\{([^}]*)\}/g, "$1")
    .replace(/\\underline\{([^}]*)\}/g, "$1")
    .replace(/\\&/g, "&")
    .replace(/\$?\|+\$?/g, "|")
    .replace(/\\+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const cleanContentLine = (line: string): string => {
  return decodeLatexText(normalizeBulletLine(line))
    .replace(/[-=]{5,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const parseToken = (line: string, prefix: string): string[] | null => {
  if (!line.startsWith(prefix)) {
    return null;
  }
  return line
    .slice(prefix.length)
    .split("||")
    .map((part) => cleanContentLine(part));
};

const isSectionMarkerLine = (line: string): boolean =>
  /^(summary|experience|education|skills|projects|technical skills|certifications|other)\s*:?\s*$/i.test(
    line,
  );

const isDateLike = (line: string): boolean =>
  /\b(19|20)\d{2}\b|\bpresent\b|\bcurrent\b|\bjan\.?\b|\bfeb\.?\b|\bmar\.?\b|\bapr\.?\b|\bmay\b|\bjun\.?\b|\bjul\.?\b|\baug\.?\b|\bsep\.?\b|\boct\.?\b|\bnov\.?\b|\bdec\.?\b|--/i.test(
    line,
  );

const isInstitutionLike = (line: string): boolean =>
  /\b(university|college|institute|school|academy)\b/i.test(line);

const isLocationLike = (line: string): boolean =>
  /^[A-Za-z .'-]+,\s*[A-Z]{2}$/.test(line);

interface EducationEntry {
  school: string;
  location: string;
  degree: string;
  dates: string;
}

const buildEducationEntries = (lines: string[]): EducationEntry[] => {
  const tokenEntries = lines
    .map((line) => parseToken(line, "EDU::"))
    .filter((parts): parts is string[] => Boolean(parts))
    .map((parts) => ({
      school: parts[0] || "",
      location: parts[1] || "",
      degree: parts[2] || "",
      dates: parts[3] || "",
    }))
    .filter((entry) => entry.school || entry.degree);

  if (tokenEntries.length) {
    return tokenEntries.slice(0, MAX_EDUCATION_HEADERS);
  }

  const cleaned = dedupeKeepOrder(lines.map(cleanContentLine)).filter(
    (line) => line && !isSectionMarkerLine(line),
  );

  const entries: EducationEntry[] = [];
  let current: EducationEntry | null = null;

  for (const line of cleaned) {
    if (isInstitutionLike(line)) {
      if (current) {
        entries.push(current);
      }
      current = {
        school: line,
        location: "",
        degree: "",
        dates: "",
      };
      continue;
    }

    if (!current) {
      current = {
        school: line,
        location: "",
        degree: "",
        dates: "",
      };
      continue;
    }

    if (isLocationLike(line) && !current.location) {
      current.location = line;
      continue;
    }

    if (isDateLike(line) && !current.dates) {
      current.dates = line;
      continue;
    }

    if (!current.degree) {
      current.degree = line;
    } else {
      current.degree = `${current.degree} | ${line}`;
    }
  }

  if (current) {
    entries.push(current);
  }

  return entries
    .filter((entry) => entry.school || entry.degree)
    .slice(0, MAX_EDUCATION_HEADERS);
};

const renderEducationSection = (lines: string[]): string => {
  const entries = buildEducationEntries(lines);
  if (!entries.length) {
    return "";
  }

  const body = entries
    .map(
      (entry, idx) => `    \\resumeSubheading
      {${escapeLatex(entry.school || `Education ${idx + 1}`)}}{${escapeLatex(entry.location || "")}}
      {${escapeLatex(entry.degree || "")}}{${escapeLatex(entry.dates || "")}}`,
    )
    .join("\n");

  return `\\section{Education}
  \\resumeSubHeadingListStart
${body}
  \\resumeSubHeadingListEnd`;
};

interface ExperienceEntry {
  title: string;
  dates: string;
  company: string;
  location: string;
  bullets: string[];
}

const buildExperienceEntries = (lines: string[], addedSkillExperience?: string): ExperienceEntry[] => {
  const entries: ExperienceEntry[] = [];
  let current: ExperienceEntry | null = null;

  const pushCurrent = () => {
    if (!current) {
      return;
    }
    current.bullets = dedupeKeepOrder(current.bullets).slice(0, MAX_BULLETS_PER_HEADER);
    if (current.title || current.company || current.bullets.length) {
      entries.push(current);
    }
    current = null;
  };

  for (const line of lines) {
    const tokenHeader = parseToken(line, "EXP_HEADER::");
    if (tokenHeader) {
      pushCurrent();
      current = {
        title: tokenHeader[0] || "Experience",
        dates: tokenHeader[1] || "",
        company: tokenHeader[2] || "",
        location: tokenHeader[3] || "",
        bullets: [],
      };
      continue;
    }

    const tokenBullet = parseToken(line, "EXP_BULLET::");
    if (tokenBullet) {
      if (!current) {
        current = { title: "Experience", dates: "", company: "", location: "", bullets: [] };
      }
      if (tokenBullet[0]) {
        current.bullets.push(tokenBullet[0]);
      }
      continue;
    }
  }
  pushCurrent();

  if (!entries.length) {
    const cleaned = dedupeKeepOrder(lines.map(cleanContentLine)).filter(
      (line) => line && !isSectionMarkerLine(line),
    );
    let fallbackCurrent: ExperienceEntry | null = null;

    const pushFallback = () => {
      if (!fallbackCurrent) {
        return;
      }
      fallbackCurrent.bullets = dedupeKeepOrder(fallbackCurrent.bullets).slice(0, MAX_BULLETS_PER_HEADER);
      if (fallbackCurrent.title || fallbackCurrent.company || fallbackCurrent.bullets.length) {
        entries.push(fallbackCurrent);
      }
      fallbackCurrent = null;
    };

    for (const line of cleaned) {
      const headerLike = isDateLike(line) && line.length < 120;
      if (headerLike) {
        pushFallback();
        fallbackCurrent = {
          title: line,
          dates: "",
          company: "",
          location: "",
          bullets: [],
        };
        continue;
      }

      if (!fallbackCurrent) {
        fallbackCurrent = { title: "Experience", dates: "", company: "", location: "", bullets: [] };
      }

      if (!fallbackCurrent.company && line.length < 90 && /,|inc|llc|corp|company|organization|lab|university|college/i.test(line)) {
        if (isLocationLike(line)) {
          fallbackCurrent.location = line;
        } else {
          fallbackCurrent.company = line;
        }
        continue;
      }

      fallbackCurrent.bullets.push(line);
    }
    pushFallback();
  }

  if (addedSkillExperience && addedSkillExperience.trim().toLowerCase() !== "no experience") {
    if (!entries.length) {
      entries.push({
        title: "Professional Experience",
        dates: "",
        company: "",
        location: "",
        bullets: [],
      });
    }
    entries[0].bullets = [
      `Applied role-relevant skills by ${addedSkillExperience.trim()}`,
      ...entries[0].bullets,
    ].slice(0, MAX_BULLETS_PER_HEADER);
  }

  return entries.slice(0, MAX_EXPERIENCE_HEADERS).map((entry) => ({
    ...entry,
    bullets: entry.bullets.slice(0, MAX_BULLETS_PER_HEADER),
  }));
};

const renderExperienceSection = (lines: string[], addedSkillExperience?: string): string => {
  const entries = buildExperienceEntries(lines, addedSkillExperience).filter((entry) => entry.bullets.length);
  if (!entries.length) {
    return "";
  }

  const body = entries
    .map((entry) => {
      const bullets = entry.bullets
        .slice(0, MAX_BULLETS_PER_HEADER)
        .map((bullet) => `        \\resumeItem{${escapeLatex(bullet)}}`)
        .join("\n");

      return `    \\resumeSubheading
      {${escapeLatex(entry.title || "Experience")}}{${escapeLatex(entry.dates || "")}}
      {${escapeLatex(entry.company || "")}}{${escapeLatex(entry.location || "")}}
      \\resumeItemListStart
${bullets}
      \\resumeItemListEnd`;
    })
    .join("\n\n");

  return `\\section{Experience}
  \\resumeSubHeadingListStart
${body}
  \\resumeSubHeadingListEnd`;
};

interface ProjectEntry {
  heading: string;
  dates: string;
  bullets: string[];
}

const buildProjectEntries = (lines: string[]): ProjectEntry[] => {
  const entries: ProjectEntry[] = [];
  let current: ProjectEntry | null = null;

  const pushCurrent = () => {
    if (!current) {
      return;
    }
    current.bullets = dedupeKeepOrder(current.bullets).slice(0, MAX_BULLETS_PER_HEADER);
    if (current.heading || current.bullets.length) {
      entries.push(current);
    }
    current = null;
  };

  for (const line of lines) {
    const tokenHeader = parseToken(line, "PRJ_HEADER::");
    if (tokenHeader) {
      pushCurrent();
      current = {
        heading: tokenHeader[0] || "Project",
        dates: tokenHeader[1] || "",
        bullets: [],
      };
      continue;
    }

    const tokenBullet = parseToken(line, "PRJ_BULLET::");
    if (tokenBullet) {
      if (!current) {
        current = { heading: "Project", dates: "", bullets: [] };
      }
      if (tokenBullet[0]) {
        current.bullets.push(tokenBullet[0]);
      }
      continue;
    }
  }
  pushCurrent();

  if (!entries.length) {
    const cleaned = dedupeKeepOrder(lines.map(cleanContentLine)).filter(
      (line) => line && !isSectionMarkerLine(line),
    );

    for (const line of cleaned) {
      const headerLike = (line.includes("|") || isDateLike(line)) && line.length < 120;
      if (headerLike) {
        pushCurrent();
        current = { heading: line, dates: "", bullets: [] };
        continue;
      }

      if (!current) {
        current = { heading: "Project", dates: "", bullets: [] };
      }
      current.bullets.push(line);
    }
    pushCurrent();
  }

  return entries.slice(0, MAX_PROJECT_HEADERS).map((entry) => ({
    ...entry,
    bullets: entry.bullets.slice(0, MAX_BULLETS_PER_HEADER),
  }));
};

const renderProjectsSection = (lines: string[]): string => {
  const entries = buildProjectEntries(lines).filter((entry) => entry.bullets.length);
  if (!entries.length) {
    return "";
  }

  const body = entries
    .map((entry) => {
      const bullets = entry.bullets
        .slice(0, MAX_BULLETS_PER_HEADER)
        .map((line) => `            \\resumeItem{${escapeLatex(line)}}`)
        .join("\n");

      return `      \\resumeProjectHeading
          {${escapeLatex(entry.heading || "Project")}}{${escapeLatex(entry.dates || "")}}
          \\resumeItemListStart
${bullets}
          \\resumeItemListEnd`;
    })
    .join("\n");

  return `\\section{Projects}
    \\resumeSubHeadingListStart
${body}
    \\resumeSubHeadingListEnd`;
};

const splitSkillItems = (value: string): string[] =>
  value
    .split(/,|\/|\||;/)
    .map((part) => cleanContentLine(part))
    .filter(Boolean);

const mapSkillLabel = (label: string): "Languages" | "Frameworks" | "Developer Tools" | "Libraries" | "Other" => {
  const normalized = label.toLowerCase();
  if (normalized.includes("language")) {
    return "Languages";
  }
  if (normalized.includes("framework")) {
    return "Frameworks";
  }
  if (normalized.includes("tool")) {
    return "Developer Tools";
  }
  if (normalized.includes("librar")) {
    return "Libraries";
  }
  return "Other";
};

const renderSkillsSection = (resume: ResumeDocument, addedSkill: string): string => {
  const skillMap: Record<string, string[]> = {
    Languages: [],
    Frameworks: [],
    "Developer Tools": [],
    Libraries: [],
    Other: [],
  };

  const tokenRows = resume.sections.skills
    .map((line) => parseToken(line, "SKILL::"))
    .filter((parts): parts is string[] => Boolean(parts));

  if (tokenRows.length) {
    for (const row of tokenRows) {
      const label = mapSkillLabel(row[0] || "Other");
      const items = splitSkillItems(row[1] || "");
      skillMap[label].push(...items);
    }
  } else {
    for (const line of resume.sections.skills.map(cleanContentLine)) {
      if (!line || isSectionMarkerLine(line)) {
        continue;
      }
      const split = line.split(":");
      if (split.length > 1) {
        const label = mapSkillLabel(split[0]);
        const items = splitSkillItems(split.slice(1).join(":"));
        skillMap[label].push(...items);
      } else {
        skillMap.Frameworks.push(...splitSkillItems(line));
      }
    }
  }

  skillMap.Frameworks.push(cleanContentLine(addedSkill));
  for (const key of Object.keys(skillMap)) {
    skillMap[key] = dedupeKeepOrder(skillMap[key]).slice(0, 10);
  }

  const rows: string[] = [];
  if (skillMap.Languages.length) {
    rows.push(`     \\textbf{Languages}{: ${escapeLatex(skillMap.Languages.join(", "))}} \\\\`);
  }
  if (skillMap.Frameworks.length) {
    rows.push(`     \\textbf{Frameworks}{: ${escapeLatex(skillMap.Frameworks.join(", "))}} \\\\`);
  }
  if (skillMap["Developer Tools"].length) {
    rows.push(
      `     \\textbf{Developer Tools}{: ${escapeLatex(skillMap["Developer Tools"].join(", "))}} \\\\`,
    );
  }
  if (skillMap.Libraries.length) {
    rows.push(`     \\textbf{Libraries}{: ${escapeLatex(skillMap.Libraries.join(", "))}}`);
  }
  if (!rows.length && skillMap.Other.length) {
    rows.push(`     \\textbf{Core Skills}{: ${escapeLatex(skillMap.Other.join(", "))}}`);
  }

  if (!rows.length) {
    return "";
  }

  return `\\section{Technical Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
${rows.join("\n")}
    }}
 \\end{itemize}`;
};

export const applyProfileToTemplate = (params: {
  template: string;
  profile: ResolvedProfile;
  resume: ResumeDocument;
  addedSkill: string;
}): string => {
  const headingBlock = `\\begin{center}
    \\textbf{\\Huge \\scshape ${escapeLatex(params.profile.name)}} \\\\ \\vspace{1pt}
    \\small ${escapeLatex(params.profile.phone)} $|$ \\href{mailto:${escapeLatex(params.profile.email)}}{\\underline{${escapeLatex(params.profile.email)}}} $|$ 
    \\href{${ensureHttpsPrefix(params.profile.linkedin)}}{\\underline{${escapeLatex(params.profile.linkedin)}}} $|$
    \\href{${ensureHttpsPrefix(params.profile.github)}}{\\underline{${escapeLatex(params.profile.github)}}}
\\end{center}`;

  let latex = params.template.replace(/\\begin\{center\}[\s\S]*?\\end\{center\}/, headingBlock);
  const educationBlock = renderEducationSection(params.resume.sections.education);
  const experienceBlock = renderExperienceSection(
    params.resume.sections.experience,
    params.profile.addedSkillExperience,
  );
  const projectsBlock = renderProjectsSection(params.resume.sections.projects);
  const skillsBlock = renderSkillsSection(params.resume, params.addedSkill);

  if (educationBlock) {
    latex = replaceSectionBlock(latex, "Education", educationBlock);
  }
  if (experienceBlock) {
    latex = replaceSectionBlock(latex, "Experience", experienceBlock);
  }
  if (projectsBlock) {
    latex = replaceSectionBlock(latex, "Projects", projectsBlock);
  }
  if (skillsBlock) {
    latex = replaceSectionBlock(latex, "Technical Skills", skillsBlock);
  }

  return latex;
};
