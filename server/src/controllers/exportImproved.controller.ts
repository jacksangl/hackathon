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

const mimeFor = (format: "pdf" | "txt" | "docx" | "doc"): string => {
  if (format === "pdf") {
    return "application/pdf";
  }
  if (format === "doc") {
    return "application/msword";
  }
  if (format === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return "text/plain; charset=utf-8";
};

const extensionFor = (format: "pdf" | "txt" | "docx" | "doc"): string => {
  return format === "txt" ? "txt" : format;
};

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
  const tmpDir = path.join(os.tmpdir(), `improved-resume-export-${randomUUID()}`);
  const mdPath = path.join(tmpDir, "resume.md");
  const outPath = path.join(tmpDir, `resume.${extensionFor(format)}`);

  await fs.mkdir(tmpDir, { recursive: true });

  try {
    if (format === "pdf") {
      const latexCompile = await compileLatexToPdf(input.latex);
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

    const plainText = await toPlainText(input.latex, tmpDir);

    if (format === "txt") {
      await fs.writeFile(outPath, plainText, "utf-8");
    } else if (format === "doc") {
      const rtf = toRtf(plainText);
      await fs.writeFile(outPath, rtf, "utf-8");
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
