import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";

import { analyzeRouter } from "./routes/analyze.routes";
import { coverLetterRouter } from "./routes/coverLetter.routes";
import { downloadRouter } from "./routes/download.routes";
import { exportImprovedRouter } from "./routes/exportImproved.routes";
import { interviewRouter } from "./routes/interview.routes";
import { improveRouter } from "./routes/improve.routes";
import { resumeRouter } from "./routes/resume.routes";
import { rewriteRouter } from "./routes/rewrite.routes";
import { skillGapRouter } from "./routes/skillGap.routes";
import { tailorRouter } from "./routes/tailor.routes";
import { uploadRouter } from "./routes/upload.routes";
import { uploadsRouter } from "./routes/uploads.routes";
import { errorHandler, notFoundHandler } from "./utils/errors";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
    exposedHeaders: ["X-Export-Mode", "X-Export-Engine", "X-Export-Reason", "X-Export-Fallback"],
  }),
);
app.use(morgan("dev"));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(uploadRouter);
app.use(uploadsRouter);
app.use(analyzeRouter);
app.use(improveRouter);
app.use(exportImprovedRouter);
app.use(rewriteRouter);
app.use(tailorRouter);
app.use(coverLetterRouter);
app.use(interviewRouter);
app.use(skillGapRouter);
app.use(resumeRouter);
app.use(downloadRouter);

app.use(notFoundHandler);
app.use(errorHandler);
