import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { runPandoc } from "./pandoc";

const fallbackTexToPlain = (input: string): string => {
  return input
    .replace(/%.*$/gm, "")
    .replace(/\\section\*?\{([^}]*)\}/g, "\n$1\n")
    .replace(/\\subsection\*?\{([^}]*)\}/g, "\n$1\n")
    .replace(/\\resumeItem\{([^}]*)\}/g, "\n- $1")
    .replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?\{([^}]*)\}/g, " $1 ")
    .replace(/\\[a-zA-Z]+\*?/g, " ")
    .replace(/[{}]/g, "\n")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export const parseTexBuffer = async (buffer: Buffer): Promise<string> => {
  const tmpDir = path.join(os.tmpdir(), `resume-tex-${randomUUID()}`);
  const texPath = path.join(tmpDir, "resume.tex");
  const outPath = path.join(tmpDir, "resume.txt");
  const originalText = buffer.toString("utf-8");

  await fs.mkdir(tmpDir, { recursive: true });
  await fs.writeFile(texPath, buffer);

  try {
    try {
      await runPandoc([texPath, "-f", "latex", "-t", "plain", "-o", outPath]);
      return await fs.readFile(outPath, "utf-8");
    } catch {
      return fallbackTexToPlain(originalText);
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
};
