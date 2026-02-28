import { Request, Response } from "express";

import { deleteUploadedResume, listUploadedResumes } from "../services/storage.service";
import { deleteUploadedResumeSchema } from "../schemas/requestSchemas";

export const listUploadedResumesController = async (_req: Request, res: Response) => {
  const documents = await listUploadedResumes();

  res.json({
    documents,
  });
};

export const deleteUploadedResumeController = async (req: Request, res: Response) => {
  const { filePath } = deleteUploadedResumeSchema.parse(req.body);
  await deleteUploadedResume(filePath);
  res.json({ ok: true });
};
