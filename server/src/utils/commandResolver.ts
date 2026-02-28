import { spawnSync } from "node:child_process";

const commonPaths = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"];

export const resolveCommandCandidates = (command: string): string[] => {
  const set = new Set<string>([command, ...commonPaths.map((dir) => `${dir}/${command}`)]);
  return [...set];
};

export const resolveFirstAvailableCommand = (command: string): string | null => {
  for (const candidate of resolveCommandCandidates(command)) {
    const checker = process.platform === "win32" ? "where" : "which";
    const result = spawnSync(checker, [candidate], { stdio: "ignore" });
    if (result.status === 0) {
      return candidate;
    }
  }
  return null;
};
