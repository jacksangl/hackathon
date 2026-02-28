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

  if (profileResolution.missingFields.length) {
    res.json({
      needsInput: true,
      missingFields: profileResolution.missingFields,
      defaults: profileResolution.resolved,
      message:
        "Some profile or skill information is missing. Provide values or type 'No experience' where appropriate.",
    });
    return;
  }

  const deterministicLatex = applyProfileToTemplate({
    template,
    profile: profileResolution.resolved,
    resume,
    addedSkill: effectiveAddedSkill,
  });

  const improved = await aiService.improveLatexResume({
    templateLatex: deterministicLatex,
    resume: {
      ...resume,
      sections: toDisplaySections(resume.sections),
    },
    jobDescription: input.jobDescriptionText,
    addedSkill: effectiveAddedSkill,
    addedSkillExperience: profileResolution.resolved.addedSkillExperience,
  });

  const aiLatex = normalizeLatexCandidate(improved.improvedLatex);
  const framedAiLatex = mergeIntoTemplateFrame(deterministicLatex, aiLatex);
  let improvedLatex =
    framedAiLatex.length >= Math.floor(deterministicLatex.length * 0.85)
      ? framedAiLatex
      : deterministicLatex;
  improvedLatex = clampResumeItemLists(improvedLatex, 4);
  const changeSummary =
    improvedLatex === framedAiLatex
      ? improved.changeSummary
      : [
          "Preserved full resume detail to avoid dropping content during AI rewrite.",
          ...improved.changeSummary,
        ];

  if (!(await canParseLatex(improvedLatex))) {
    improvedLatex = deterministicLatex;
    changeSummary.unshift(
      "AI output produced invalid LaTeX. Reverted to deterministic compile-safe template output.",
    );
  }

  if (!(await canParseLatex(improvedLatex))) {
    throw new ApiError(
      422,
      "Could not produce compile-safe LaTeX from current resume content. Please try simplifying unsupported characters.",
    );
  }

  if (hasLatexEngine()) {
    const candidates = uniqueLatexCandidates([
      { latex: improvedLatex },
      { latex: clampResumeItemLists(improvedLatex, 4), reason: "Limited each header to max 4 bullets to fit one page." },
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

    for (const candidate of candidates) {
      const compileResult = await compileLatexToPdf(candidate.latex);
      if (!compileResult.ok) {
        lastCompileError = compileResult.errors.join(" | ").slice(0, 900);
        continue;
      }

      const pageCount = compileResult.pdf ? countPdfPages(compileResult.pdf) : 0;
      lastPageCount = pageCount;
      if (!pageCount || pageCount <= 1) {
        selectedLatex = candidate.latex;
        selectedReason = candidate.reason;
        break;
      }
    }

    if (!selectedLatex) {
      throw new ApiError(
        422,
        `Could not produce a compile-safe one-page resume. Last pages=${lastPageCount || "unknown"}${lastCompileError ? `, last error=${lastCompileError}` : ""}`,
      );
    }

    improvedLatex = selectedLatex;
    if (selectedReason) {
      changeSummary.unshift(selectedReason);
    }
  }

  res.json({
    needsInput: false,
    improvedLatex,
    changeSummary,
    appliedProfile: profileResolution.resolved,
    appliedSkill: effectiveAddedSkill,
  });
};
