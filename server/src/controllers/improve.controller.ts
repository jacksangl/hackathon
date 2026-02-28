import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { Request, Response } from "express";

import { improveRequestSchema } from "../schemas/requestSchemas";
import { parseResumeFile, toDisplaySections } from "../services/parser.service";
import { downloadInputFile } from "../services/storage.service";
import {
  applyProfileToTemplate,
  extractProfileFromResumeText,
  extractProfileFromTemplate,
  loadDefaultResumeTemplate,
  resolveProfileAndMissing,
} from "../services/defaultTemplate.service";
import { aiService } from "../services/ai.service";
import { ApiError } from "../utils/errors";
import { runPandoc } from "../utils/pandoc";
import { getRequiredSkillCandidates } from "../utils/keywordExtractor";
import { compileLatexToPdf, hasLatexEngine } from "../utils/latexCompile";

const normalizeLatexCandidate = (latex: string): string => {
  return latex
    .replace(/^```latex\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
};

const BEGIN_DOC = "\\begin{document}";
const END_DOC = "\\end{document}";

const mergeIntoTemplateFrame = (templateLatex: string, candidateLatex: string): string => {
  const templateBegin = templateLatex.indexOf(BEGIN_DOC);
  const templateEnd = templateLatex.lastIndexOf(END_DOC);
  const candidateBegin = candidateLatex.indexOf(BEGIN_DOC);
  const candidateEnd = candidateLatex.lastIndexOf(END_DOC);

  if (templateBegin < 0 || templateEnd < 0 || candidateBegin < 0 || candidateEnd < 0) {
    return candidateLatex;
  }

  const preamble = templateLatex.slice(0, templateBegin + BEGIN_DOC.length);
  const postamble = templateLatex.slice(templateEnd);
  const candidateBody = candidateLatex.slice(
    candidateBegin + BEGIN_DOC.length,
    candidateEnd,
  );

  return `${preamble}\n${candidateBody}\n${postamble}`;
};

const hasMinimalLatexStructure = (latex: string): boolean => {
  if (!latex.includes("\\begin{document}") || !latex.includes("\\end{document}")) {
    return false;
  }
  let balance = 0;
  for (const char of latex) {
    if (char === "{") {
      balance += 1;
    } else if (char === "}") {
      balance -= 1;
      if (balance < 0) {
        return false;
      }
    }
  }
  return balance === 0;
};

const clampResumeItemLists = (latex: string, maxBullets = 4): string => {
  return latex.replace(
    /\\resumeItemListStart([\s\S]*?)\\resumeItemListEnd/g,
    (full, inner) => {
      const bullets = inner.match(/\\resumeItem\{[\s\S]*?\}/g) || [];
      const kept = bullets.slice(0, maxBullets).join("\n        ");
      return `\\resumeItemListStart\n        ${kept}\n      \\resumeItemListEnd`;
    },
  );
};

const countPdfPages = (pdf: Buffer): number => {
  const body = pdf.toString("latin1");
  const matches = body.match(/\/Type\s*\/Page\b/g);
  return matches ? matches.length : 0;
};

const uniqueLatexCandidates = (items: Array<{ latex: string; reason?: string }>) => {
  const seen = new Set<string>();
  const out: Array<{ latex: string; reason?: string }> = [];
  for (const item of items) {
    const normalized = item.latex.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    out.push({
      latex: normalized,
      reason: item.reason,
    });
  }
  return out;
};

const canParseLatex = async (latex: string): Promise<boolean> => {
  const tmpDir = path.join(os.tmpdir(), `resume-latex-validate-${randomUUID()}`);
  const texPath = path.join(tmpDir, "resume.tex");
  const txtPath = path.join(tmpDir, "resume.txt");

  await fs.mkdir(tmpDir, { recursive: true });
  try {
    await fs.writeFile(texPath, latex, "utf-8");
    await runPandoc([texPath, "-f", "latex", "-t", "plain", "-o", txtPath]);
    return true;
  } catch (error) {
    const message =
      error instanceof Error ? error.message.toLowerCase() : JSON.stringify(error).toLowerCase();
    if (message.includes("failed to start pandoc process")) {
      return hasMinimalLatexStructure(latex);
    }
    return false;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
};

const splitCamelSpacing = (value: string): string => value.replace(/([a-z])([A-Z])/g, "$1 $2");

const isDateLikeValue = (value: string): boolean =>
  /\b(19|20)\d{2}\b|\bpresent\b|\bcurrent\b|\bjan\.?\b|\bfeb\.?\b|\bmar\.?\b|\bapr\.?\b|\bmay\b|\bjun\.?\b|\bjul\.?\b|\baug\.?\b|\bsep\.?\b|\bsept\.?\b|\boct\.?\b|\bnov\.?\b|\bdec\.?\b|--| to /i.test(
    value,
  );

const isLocationLikeValue = (value: string): boolean =>
  /^[A-Za-z .'-]+,\s*(?:[A-Z]{2}|[A-Za-z .'-]+)$/.test(value.trim());

const splitNameDate = (value: string): { name: string; date: string } | null => {
  const normalized = splitCamelSpacing(value).replace(/\s+/g, " ").trim();
  const match = normalized.match(
    /^(.*?)(?:\s*)((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|(?:19|20)\d{2})$/i,
  );
  if (!match) {
    return null;
  }
  const name = match[1].trim().replace(/[-|,]+$/, "").trim();
  const date = match[2].trim();
  if (!name || !date) {
    return null;
  }
  return { name, date };
};

const splitOrgLocation = (value: string): { org: string; location: string } | null => {
  const normalized = splitCamelSpacing(value).replace(/\s+/g, " ").trim();
  const commaIndex = normalized.lastIndexOf(",");
  if (commaIndex < 0) {
    return null;
  }

  const preComma = normalized.slice(0, commaIndex).trim();
  const region = normalized.slice(commaIndex + 1).trim();
  if (!preComma || !region) {
    return null;
  }

  const words = preComma.split(/\s+/).filter(Boolean);
  if (words.length < 2) {
    return null;
  }

  const city = words[words.length - 1];
  const org = words.slice(0, -1).join(" ").trim();
  const location = `${city}, ${region}`;
  if (!org || !isLocationLikeValue(location)) {
    return null;
  }
  return { org, location };
};

const normalizeResumeSubheadingArgsInLatex = (latex: string): string => {
  return latex.replace(
    /\\resumeSubheading\s*\n?\s*\{([^}]*)\}\{([^}]*)\}\s*\n?\s*\{([^}]*)\}\{([^}]*)\}/g,
    (_full, rawA1: string, rawA2: string, rawA3: string, rawA4: string) => {
      let a1 = rawA1.trim();
      let a2 = rawA2.trim();
      let a3 = rawA3.trim();
      let a4 = rawA4.trim();

      if (!a2) {
        const split = splitNameDate(a1);
        if (split) {
          a1 = split.name;
          a2 = split.date;
        }
      }

      if (!a4) {
        const split = splitOrgLocation(a3);
        if (split) {
          a3 = split.org;
          a4 = split.location;
        }
      }

      if (isDateLikeValue(a4) && !isDateLikeValue(a2)) {
        const tmp = a2;
        a2 = a4;
        a4 = tmp;
      }

      return `\\resumeSubheading\n      {${a1}}{${a2}}\n      {${a3}}{${a4}}`;
    },
  );
};

const normalizeGeneratedBullet = (value: string): string => {
  const trimmed = value
    .replace(/^[-*•]\s*/, "")
    .replace(/^applied role-relevant skills by\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!trimmed) {
    return "";
  }
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

const buildAddedSkillBullet = async (params: {
  addedSkill: string;
  addedSkillExperience?: string;
  jobDescriptionText: string;
}): Promise<string | undefined> => {
  const note = params.addedSkillExperience?.trim();
  if (!note || note.toLowerCase() === "no experience") {
    return undefined;
  }

  const fallback = normalizeGeneratedBullet(`Used ${params.addedSkill} in practice by ${note}`);

  const rewritten = await aiService.rewrite({
    section: "experience",
    mode: "inline",
    text: `Skill: ${params.addedSkill}. Experience note: ${note}`,
    jobDescription: params.jobDescriptionText,
  });

  const candidate = normalizeGeneratedBullet(rewritten.rewrittenText || "");
  return candidate || fallback;
};

export const improveResumeController = async (req: Request, res: Response) => {
  const input = improveRequestSchema.parse(req.body);
  const effectiveAddedSkill =
    input.addedSkill?.trim() ||
    getRequiredSkillCandidates(input.jobDescriptionText, 12)[0] ||
    "communication";

  const extension = path.extname(input.filePath).toLowerCase();
  const supported = [".pdf", ".docx", ".tex"];
  if (!supported.includes(extension)) {
    throw new ApiError(400, "Unsupported file extension in filePath");
  }

  const fileBuffer = await downloadInputFile(input.filePath);
  const resume = await parseResumeFile(fileBuffer, `resume${extension}`);

  const template = await loadDefaultResumeTemplate();
  const templateProfile = extractProfileFromTemplate(template);
  const inferredProfile = extractProfileFromResumeText(resume.rawText);
  const extractedProfile = {
    name: inferredProfile.name || templateProfile.name,
    phone: inferredProfile.phone || templateProfile.phone,
    email: inferredProfile.email || templateProfile.email,
    linkedin: inferredProfile.linkedin || templateProfile.linkedin,
    github: inferredProfile.github || templateProfile.github,
  };
  const profileResolution = resolveProfileAndMissing({
    extractedProfile,
    overrides: input.userProfile,
    addedSkill: effectiveAddedSkill,
    resumeText: resume.rawText,
  });
  const missingInputWarnings = profileResolution.missingFields.map((field) => field.label);
  const resolvedProfile = {
    ...profileResolution.resolved,
    // Non-blocking fallback: avoid fabricating skill experience when user did not provide one.
    addedSkillExperience:
      profileResolution.resolved.addedSkillExperience ||
      (profileResolution.missingFields.some((field) => field.key === "addedSkillExperience")
        ? "No experience"
        : undefined),
  };

  const addedSkillBullet = await buildAddedSkillBullet({
    addedSkill: effectiveAddedSkill,
    addedSkillExperience: resolvedProfile.addedSkillExperience,
    jobDescriptionText: input.jobDescriptionText,
  });

  const deterministicLatex = applyProfileToTemplate({
    template,
    profile: resolvedProfile,
    resume,
    addedSkill: effectiveAddedSkill,
    addedSkillBullet,
  });

  const improved = await aiService.improveLatexResume({
    templateLatex: deterministicLatex,
    resume: {
      ...resume,
      sections: toDisplaySections(resume.sections),
    },
    jobDescription: input.jobDescriptionText,
    addedSkill: effectiveAddedSkill,
    addedSkillExperience: resolvedProfile.addedSkillExperience,
  });

  // Stability rule: deterministic template rendering is the source of truth.
  // AI can suggest wording, but full-document AI LaTeX is not trusted as-is.
  let improvedLatex = clampResumeItemLists(deterministicLatex, 4);
  const changeSummary =
    improved.changeSummary && improved.changeSummary.length
      ? improved.changeSummary
      : ["Applied ATS-focused improvements while preserving strict template structure."];
  if (missingInputWarnings.length) {
    changeSummary.unshift(
      `Used safe fallbacks for missing profile fields: ${missingInputWarnings.join(", ")}.`,
    );
  }

  if (!(await canParseLatex(improvedLatex))) {
    improvedLatex = deterministicLatex;
    changeSummary.unshift(
      "Generated output failed structural parse check. Reverted to deterministic template output.",
    );
  }

  if (hasLatexEngine()) {
    const candidates = uniqueLatexCandidates([
      { latex: improvedLatex },
      { latex: clampResumeItemLists(improvedLatex, 3), reason: "Limited each header to max 3 bullets to fit one page." },
      { latex: clampResumeItemLists(improvedLatex, 2), reason: "Limited each header to max 2 bullets only where needed to fit one page." },
      { latex: deterministicLatex, reason: "Used deterministic template-safe rendering due AI compile/layout constraints." },
      { latex: clampResumeItemLists(deterministicLatex, 4), reason: "Applied one-page trim on deterministic rendering (max 4 bullets/header)." },
      { latex: clampResumeItemLists(deterministicLatex, 3), reason: "Applied one-page trim on deterministic rendering (max 3 bullets/header)." },
      { latex: clampResumeItemLists(deterministicLatex, 2), reason: "Applied one-page trim on deterministic rendering (max 2 bullets/header)." },
    ]);

    let selectedLatex: string | null = null;
    let selectedReason: string | undefined;
    let lastCompileError: string | null = null;
    let lastPageCount = 0;
    let bestCompileSafeLatex: string | null = null;
    let bestCompileSafeReason: string | undefined;
    let bestCompileSafePages = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
      const compileResult = await compileLatexToPdf(candidate.latex);
      if (!compileResult.ok) {
        lastCompileError = compileResult.errors.join(" | ").slice(0, 900);
        continue;
      }

      const pageCount = compileResult.pdf ? countPdfPages(compileResult.pdf) : 0;
      lastPageCount = pageCount;
      if (pageCount > 0 && pageCount < bestCompileSafePages) {
        bestCompileSafePages = pageCount;
        bestCompileSafeLatex = candidate.latex;
        bestCompileSafeReason = candidate.reason;
      } else if (!pageCount && !bestCompileSafeLatex) {
        bestCompileSafeLatex = candidate.latex;
        bestCompileSafeReason = candidate.reason;
      }
      if (!pageCount || pageCount <= 1) {
        selectedLatex = candidate.latex;
        selectedReason = candidate.reason;
        break;
      }
    }

    if (!selectedLatex) {
      if (bestCompileSafeLatex) {
        selectedLatex = bestCompileSafeLatex;
        selectedReason = bestCompileSafeReason;
        changeSummary.unshift(
          `Could not force one-page layout for this input. Returned best compile-safe output (${Number.isFinite(bestCompileSafePages) ? `${bestCompileSafePages} page(s)` : "page count unknown"}).`,
        );
      } else {
        selectedLatex = deterministicLatex;
        changeSummary.unshift(
          `Latex compile checks failed for all candidates${lastCompileError ? ` (${lastCompileError})` : ""}. Returned deterministic template output.`,
        );
      }
    }

    improvedLatex = selectedLatex;
    if (selectedReason) {
      changeSummary.unshift(selectedReason);
    }
  }

  improvedLatex = normalizeResumeSubheadingArgsInLatex(improvedLatex);

  res.json({
    needsInput: false,
    improvedLatex,
    changeSummary,
    appliedProfile: resolvedProfile,
    appliedSkill: effectiveAddedSkill,
    missingFields: profileResolution.missingFields,
    defaults: resolvedProfile,
    message: missingInputWarnings.length
      ? "Resume generated with safe fallbacks. You can still provide missing fields to refine output."
      : undefined,
  });
};
