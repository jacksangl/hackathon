import { Request, Response } from "express";

import {
  ensureArtifact,
  getGeneratedArtifactById,
  getResumeVersionById,
  updateGeneratedArtifactPaths,
  updateResumeVersionPaths,
} from "../db/queries";
import { ResumeDocument } from "../db/types";
import { downloadQuerySchema } from "../schemas/requestSchemas";
import {
  exportCoverLetterFormats,
  exportResumeFormats,
} from "../services/resumeRender.service";
import { getOutputSignedUrl } from "../services/storage.service";
import { ApiError } from "../utils/errors";

const getVersionPathByFormat = (
  version: Record<string, unknown>,
  format: "pdf" | "docx" | "tex",
): string | null => {
  if (format === "pdf") {
    return (version.pdf_path as string | null) ?? null;
  }

  if (format === "docx") {
    return (version.docx_path as string | null) ?? null;
  }

  return (version.tex_path as string | null) ?? null;
};

export const downloadController = async (req: Request, res: Response) => {
  const { format } = downloadQuerySchema.parse(req.query);
  const { id } = req.params;

  const version = await getResumeVersionById(id);
  if (version) {
    let path = getVersionPathByFormat(version, format);

    if (!path) {
      const content = version.content_json as ResumeDocument;
      const exported = await exportResumeFormats({
        versionId: version.id,
        resume: content,
      });

      const updated = await updateResumeVersionPaths({
        versionId: version.id,
        docxPath: exported.docxPath,
        pdfPath: exported.pdfPath,
        texPath: exported.texPath,
      });

      path = getVersionPathByFormat(updated, format);
    }

    if (!path) {
      throw new ApiError(
        422,
        "Requested export format unavailable. If PDF, install pdflatex or tectonic.",
      );
    }

    const downloadUrl = await getOutputSignedUrl(path);

    res.json({
      type: "resume_version",
      id,
      format,
      downloadUrl,
    });
    return;
  }

  const artifact = await getGeneratedArtifactById(id);
  if (!artifact) {
    throw new ApiError(404, "Download target not found");
  }

  if (artifact.type !== "cover_letter") {
    throw new ApiError(400, "Only cover letter artifacts are currently downloadable");
  }

  if (format === "tex") {
    throw new ApiError(400, "Cover letter export supports PDF or DOCX only");
  }

  const storedArtifact = await ensureArtifact(id);

  let path =
    format === "pdf"
      ? ((storedArtifact.pdf_path as string | null) ?? null)
      : ((storedArtifact.docx_path as string | null) ?? null);

  if (!path) {
    const contentJson = storedArtifact.content_json as { content: string };

    const exported = await exportCoverLetterFormats({
      artifactId: id,
      content: contentJson.content,
    });

    const updated = await updateGeneratedArtifactPaths({
      artifactId: id,
      docxPath: exported.docxPath,
      pdfPath: exported.pdfPath,
    });

    path =
      format === "pdf"
        ? ((updated.pdf_path as string | null) ?? null)
        : ((updated.docx_path as string | null) ?? null);
  }

  if (!path) {
    throw new ApiError(422, "PDF export unavailable. Install pdflatex or tectonic.");
  }

  const downloadUrl = await getOutputSignedUrl(path);

  res.json({
    type: "artifact",
    id,
    format,
    downloadUrl,
  });
};
