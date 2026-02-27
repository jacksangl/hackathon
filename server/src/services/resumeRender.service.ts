import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { ResumeDocument } from "../db/types";
import { logger } from "../utils/logger";
import { runPandoc } from "../utils/pandoc";
import { uploadOutputFile } from "./storage.service";

const toMarkdownSection = (title: string, lines: string[]): string => {
  if (!lines.length) {
    return "";
  }

  const content = lines.map((line) => `- ${line.replace(/^[-*•]\s*/, "")}`).join("\n");
  return `## ${title}\n${content}\n`;
};

export const resumeToMarkdown = (resume: ResumeDocument): string => {
  const sections = resume.sections;

  return [
    "# Resume",
    toMarkdownSection("Summary", sections.summary),
    toMarkdownSection("Experience", sections.experience),
    toMarkdownSection("Education", sections.education),
    toMarkdownSection("Skills", sections.skills),
    toMarkdownSection("Projects", sections.projects),
    toMarkdownSection("Certifications", sections.certifications),
    toMarkdownSection("Other", sections.other),
  ]
    .filter(Boolean)
    .join("\n");
};

const formatContentType = (format: "docx" | "pdf" | "tex") => {
  if (format === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  if (format === "pdf") {
    return "application/pdf";
  }

  return "application/x-tex";
};

const safeConvertPdf = async (mdPath: string, outputPath: string): Promise<boolean> => {
  try {
    await runPandoc([mdPath, "-f", "markdown", "-o", outputPath]);
    return true;
  } catch (error) {
    logger.warn("PDF conversion failed. Likely missing LaTeX engine.", error);
    return false;
  }
};

export const exportResumeFormats = async (params: {
  versionId: string;
  resume: ResumeDocument;
}): Promise<{ docxPath: string; texPath: string; pdfPath: string | null }> => {
  const tmpDir = path.join(os.tmpdir(), `resume-export-${randomUUID()}`);
  const mdPath = path.join(tmpDir, "resume.md");
  const docxPath = path.join(tmpDir, "resume.docx");
  const texPath = path.join(tmpDir, "resume.tex");
  const pdfPath = path.join(tmpDir, "resume.pdf");

  await fs.mkdir(tmpDir, { recursive: true });

  try {
    await fs.writeFile(mdPath, resumeToMarkdown(params.resume), "utf-8");

    await runPandoc([mdPath, "-f", "markdown", "-o", docxPath]);
    await runPandoc([mdPath, "-f", "markdown", "-t", "latex", "-o", texPath]);

    const hasPdf = await safeConvertPdf(mdPath, pdfPath);

    const docxData = await fs.readFile(docxPath);
    const texData = await fs.readFile(texPath);

    const storageDocx = `versions/${params.versionId}/resume.docx`;
    const storageTex = `versions/${params.versionId}/resume.tex`;

    await uploadOutputFile(storageDocx, docxData, formatContentType("docx"));
    await uploadOutputFile(storageTex, texData, formatContentType("tex"));

    let storagePdf: string | null = null;
    if (hasPdf) {
      const pdfData = await fs.readFile(pdfPath);
      storagePdf = `versions/${params.versionId}/resume.pdf`;
      await uploadOutputFile(storagePdf, pdfData, formatContentType("pdf"));
    }

    return {
      docxPath: storageDocx,
      texPath: storageTex,
      pdfPath: storagePdf,
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
};

export const exportCoverLetterFormats = async (params: {
  artifactId: string;
  content: string;
}): Promise<{ docxPath: string; pdfPath: string | null }> => {
  const tmpDir = path.join(os.tmpdir(), `cover-letter-export-${randomUUID()}`);
  const mdPath = path.join(tmpDir, "cover-letter.md");
  const docxPath = path.join(tmpDir, "cover-letter.docx");
  const pdfPath = path.join(tmpDir, "cover-letter.pdf");

  await fs.mkdir(tmpDir, { recursive: true });

  try {
    await fs.writeFile(mdPath, params.content, "utf-8");

    await runPandoc([mdPath, "-f", "markdown", "-o", docxPath]);
    const hasPdf = await safeConvertPdf(mdPath, pdfPath);

    const docxData = await fs.readFile(docxPath);
    const storageDocx = `artifacts/${params.artifactId}/cover-letter.docx`;
    await uploadOutputFile(storageDocx, docxData, formatContentType("docx"));

    let storagePdf: string | null = null;
    if (hasPdf) {
      const pdfData = await fs.readFile(pdfPath);
      storagePdf = `artifacts/${params.artifactId}/cover-letter.pdf`;
      await uploadOutputFile(storagePdf, pdfData, formatContentType("pdf"));
    }

    return {
      docxPath: storageDocx,
      pdfPath: storagePdf,
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
};
