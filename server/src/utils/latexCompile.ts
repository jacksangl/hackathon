import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

import { ApiError } from "./errors";
import { resolveCommandCandidates, resolveFirstAvailableCommand } from "./commandResolver";

const sanitizeLatex = (latex: string): string => {
  return latex
    .replace(/\\input\{glyphtounicode\}/g, "")
    .replace(/\\pdfgentounicode\s*=\s*1/g, "");
};

const runCommand = async (command: string, args: string[], cwd: string): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(new ApiError(500, `Failed to start ${command}`, error));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new ApiError(500, `${command} failed`, { code, stderr }));
        return;
      }
      resolve();
    });
  });
};

const tryEngine = async (
  engine: string,
  args: string[],
  cwd: string,
): Promise<{ ok: boolean; error?: string }> => {
  const resolved = resolveFirstAvailableCommand(engine);
  const candidates = resolved ? [resolved] : resolveCommandCandidates(engine);
  const errors: string[] = [];

  for (const candidate of candidates) {
    try {
      await runCommand(candidate, args, cwd);
      return { ok: true };
    } catch (error) {
      let message = error instanceof Error ? error.message : JSON.stringify(error);
      if (error instanceof ApiError) {
        const details = error.details as { stderr?: string } | undefined;
        if (details?.stderr) {
          message = `${message}: ${details.stderr}`.slice(0, 2400);
        }
      }
      errors.push(`${candidate}: ${message}`);
    }
  }

  return { ok: false, error: errors.join(" || ").slice(0, 2000) };
};

export const hasLatexEngine = (): boolean => {
  return Boolean(
    resolveFirstAvailableCommand("pdflatex") ||
      resolveFirstAvailableCommand("xelatex") ||
      resolveFirstAvailableCommand("lualatex") ||
      resolveFirstAvailableCommand("tectonic"),
  );
};

export const compileLatexToPdf = async (
  latex: string,
): Promise<{ ok: boolean; pdf?: Buffer; engine?: string; errors: string[] }> => {
  const tmpDir = path.join(os.tmpdir(), `resume-latex-compile-${randomUUID()}`);
  const texPath = path.join(tmpDir, "resume.tex");
  const pdfPath = path.join(tmpDir, "resume.pdf");
  const errors: string[] = [];

  await fs.mkdir(tmpDir, { recursive: true });

  try {
    await fs.writeFile(texPath, sanitizeLatex(latex), "utf-8");

    const attempts: Array<{ engine: string; args: string[] }> = [
      {
        engine: "pdflatex",
        args: ["-interaction=nonstopmode", "-halt-on-error", "-output-directory", tmpDir, texPath],
      },
      {
        engine: "xelatex",
        args: ["-interaction=nonstopmode", "-halt-on-error", "-output-directory", tmpDir, texPath],
      },
      {
        engine: "lualatex",
        args: ["-interaction=nonstopmode", "-halt-on-error", "-output-directory", tmpDir, texPath],
      },
      {
        engine: "tectonic",
        args: ["--outdir", tmpDir, texPath],
      },
    ];

    let engineUsed: string | undefined;
    for (const attempt of attempts) {
      const result = await tryEngine(attempt.engine, attempt.args, tmpDir);
      if (result.ok) {
        engineUsed = attempt.engine;
        break;
      }
      errors.push(`${attempt.engine}: ${result.error || "failed"}`);
    }

    if (!engineUsed) {
      return { ok: false, errors };
    }

    try {
      const pdf = await fs.readFile(pdfPath);
      return { ok: true, pdf, engine: engineUsed, errors };
    } catch (error) {
      errors.push(
        `engine ${engineUsed} returned success but PDF file was not generated: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
      );
      return { ok: false, errors, engine: engineUsed };
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
};
