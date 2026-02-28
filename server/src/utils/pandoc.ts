import { spawn } from "node:child_process";

import { ApiError } from "./errors";
import { resolveFirstAvailableCommand } from "./commandResolver";

export const runPandoc = async (args: string[]): Promise<void> => {
  const pandocBin = resolveFirstAvailableCommand("pandoc");
  if (!pandocBin) {
    throw new ApiError(
      500,
      "Pandoc not found. Install with: pnpm deps:server",
    );
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(pandocBin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(new ApiError(500, "Failed to start pandoc process", error));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new ApiError(500, "Pandoc conversion failed", { code, stderr }));
        return;
      }
      resolve();
    });
  });
};
