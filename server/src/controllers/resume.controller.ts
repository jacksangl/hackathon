import { Request, Response } from "express";

import { getResumeWithAnalyses, listResumeVersions } from "../db/queries";
import { resumeVersionsQuerySchema } from "../schemas/requestSchemas";

export const resumeVersionsController = async (req: Request, res: Response) => {
  const query = resumeVersionsQuerySchema.parse(req.query);
  const versions = await listResumeVersions(query.resumeId);

  const progression = versions.map((version) => ({
    versionId: version.id,
    label: version.label,
    atsScore: version.ats_score,
    createdAt: version.created_at,
    improvementReason: version.improvement_reason,
  }));

  res.json({
    versions,
    progression,
  });
};

export const getResumeController = async (req: Request, res: Response) => {
  const resume = await getResumeWithAnalyses(req.params.id);
  res.json(resume);
};
