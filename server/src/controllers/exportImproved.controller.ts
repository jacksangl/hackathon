import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Request, Response } from "express";

import { exportImprovedResumeSchema } from "../schemas/requestSchemas";
import { ApiError } from "../utils/errors";
import { compileLatexToPdf } from "../utils/latexCompile";
import { runPandoc } from "../utils/pandoc";
import { logger } from "../utils/logger";

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

const fallbackLatexToText = (latex: string): string => {
  return latex
    .replace(/%.*$/gm, "")
    .replace(/\\section\*?\{([^}]*)\}/g, "\n$1\n")
    .replace(/\\resumeItem\{([^}]*)\}/g, "\n- $1")
    .replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?\{([^}]*)\}/g, " $1 ")
    .replace(/\\[a-zA-Z]+\*?/g, " ")
    .replace(/[{}]/g, "\n")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim();
};

const toRtf = (text: string): string => {
  const escaped = text
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\r/g, "");

  const body = escaped.split("\n").map((line) => `${line}\\par`).join("\n");
  return `{\\rtf1\\ansi\\deff0\n{\\fonttbl{\\f0 Arial;}}\n\\f0\\fs22\n${body}\n}`;
};

const mimeFor = (format: "pdf" | "txt" | "docx"): string => {
  if (format === "pdf") {
    return "application/pdf";
  }
  if (format === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return "text/plain; charset=utf-8";
};

const extensionFor = (format: "pdf" | "txt" | "docx"): string => format;

const toPlainText = async (latex: string, tmpDir: string): Promise<string> => {
  const texPath = path.join(tmpDir, "resume-plain.tex");
  const txtPath = path.join(tmpDir, "resume.txt");
  await fs.writeFile(texPath, latex, "utf-8");

  try {
    await runPandoc([texPath, "-f", "latex", "-t", "plain", "-o", txtPath]);
    const parsed = await fs.readFile(txtPath, "utf-8");
    return parsed.trim() || fallbackLatexToText(latex);
  } catch {
    return fallbackLatexToText(latex);
  }
};

const toMarkdown = (plainText: string): string => {
  const lines = plainText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .map((line) => {
      if (/^[-*•]\s+/.test(line)) {
        return `- ${line.replace(/^[-*•]\s+/, "")}`;
      }
      return line;
    })
    .join("\n");
};

export const exportImprovedResumeController = async (req: Request, res: Response) => {
  const input = exportImprovedResumeSchema.parse(req.body);
  const format = input.format;
  const normalizedLatex = normalizeResumeSubheadingArgsInLatex(input.latex);
  const tmpDir = path.join(os.tmpdir(), `improved-resume-export-${randomUUID()}`);
  const mdPath = path.join(tmpDir, "resume.md");
  const outPath = path.join(tmpDir, `resume.${extensionFor(format)}`);

  await fs.mkdir(tmpDir, { recursive: true });

  try {
    if (format === "pdf") {
      const latexCompile = await compileLatexToPdf(normalizedLatex);
      if (!latexCompile.ok || !latexCompile.pdf) {
        const reason = latexCompile.errors.join(" | ").slice(0, 1800);
        logger.error(`LaTeX PDF compile failed: ${reason}`);
        throw new ApiError(
          422,
          `PDF compile failed. Ensure LaTeX engine works on server. ${reason}`,
        );
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'attachment; filename="optimized-resume.pdf"');
      res.setHeader("X-Export-Mode", "latex");
      res.setHeader("X-Export-Engine", latexCompile.engine || "unknown");
      res.send(latexCompile.pdf);
      return;
    }

    const plainText = await toPlainText(normalizedLatex, tmpDir);

    if (format === "txt") {
      await fs.writeFile(outPath, plainText, "utf-8");
    } else {
      const markdown = toMarkdown(plainText);
      await fs.writeFile(mdPath, markdown, "utf-8");
      await runPandoc([mdPath, "-f", "markdown", "-o", outPath]);
    }

    const output = await fs.readFile(outPath);
    const filename = `optimized-resume.${extensionFor(format)}`;

    res.setHeader("Content-Type", mimeFor(format));
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(output);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
};
