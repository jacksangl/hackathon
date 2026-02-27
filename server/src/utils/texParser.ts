import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { runPandoc } from "./pandoc";

export const parseTexBuffer = async (buffer: Buffer): Promise<string> => {
  const tmpDir = path.join(os.tmpdir(), `resume-tex-${randomUUID()}`);
  const texPath = path.join(tmpDir, "resume.tex");
  const outPath = path.join(tmpDir, "resume.txt");

  await fs.mkdir(tmpDir, { recursive: true });
  await fs.writeFile(texPath, buffer);

  try {
    await runPandoc([texPath, "-f", "latex", "-t", "plain", "-o", outPath]);
    return await fs.readFile(outPath, "utf-8");
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
};
