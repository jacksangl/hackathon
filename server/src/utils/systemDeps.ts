import { resolveFirstAvailableCommand } from "./commandResolver";

export interface SystemDepsStatus {
  pandoc: boolean;
  pdflatex: boolean;
  xelatex: boolean;
  lualatex: boolean;
  tectonic: boolean;
}

const hasCommand = (command: string): boolean => Boolean(resolveFirstAvailableCommand(command));

export const getSystemDepsStatus = (): SystemDepsStatus => {
  return {
    pandoc: hasCommand("pandoc"),
    pdflatex: hasCommand("pdflatex"),
    xelatex: hasCommand("xelatex"),
    lualatex: hasCommand("lualatex"),
    tectonic: hasCommand("tectonic"),
  };
};

export const getMissingDeps = (status: SystemDepsStatus): string[] => {
  const missing: string[] = [];
  if (!status.pandoc) {
    missing.push("pandoc");
  }
  if (!status.pdflatex && !status.xelatex && !status.lualatex && !status.tectonic) {
    missing.push("latex-engine (pdflatex/xelatex/lualatex/tectonic)");
  }
  return missing;
};
