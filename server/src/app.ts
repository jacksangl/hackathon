import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";

import { analyzeRouter } from "./routes/analyze.routes";
import { coverLetterRouter } from "./routes/coverLetter.routes";
import { downloadRouter } from "./routes/download.routes";
import { interviewRouter } from "./routes/interview.routes";
import { resumeRouter } from "./routes/resume.routes";
import { rewriteRouter } from "./routes/rewrite.routes";
import { skillGapRouter } from "./routes/skillGap.routes";
import { tailorRouter } from "./routes/tailor.routes";
import { uploadRouter } from "./routes/upload.routes";
import { errorHandler, notFoundHandler } from "./utils/errors";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
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
app.use(analyzeRouter);
app.use(rewriteRouter);
app.use(tailorRouter);
app.use(coverLetterRouter);
app.use(interviewRouter);
app.use(skillGapRouter);
app.use(resumeRouter);
app.use(downloadRouter);

app.use(notFoundHandler);
app.use(errorHandler);
