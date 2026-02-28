import { spawnSync } from "node:child_process";

const run = (cmd: string, args: string[]): boolean => {
  const result = spawnSync(cmd, args, { stdio: "inherit" });
  return result.status === 0;
};

const has = (cmd: string): boolean => {
  const checker = process.platform === "win32" ? "where" : "which";
  return spawnSync(checker, [cmd], { stdio: "ignore" }).status === 0;
};

const installMac = () => {
  if (!has("brew")) {
    console.error("Homebrew not found. Install Homebrew first: https://brew.sh");
    process.exit(1);
  }

  // Tectonic is a lightweight LaTeX engine and enough for resume PDF compile.
  const ok = run("brew", ["install", "pandoc", "tectonic"]);
  if (!ok) {
    console.error("Failed installing pandoc/tectonic via brew.");
    process.exit(1);
  }
};

const installLinux = () => {
  if (has("apt-get")) {
    const ok = run("bash", [
      "-lc",
      "sudo apt-get update && sudo apt-get install -y pandoc tectonic",
    ]);
    if (!ok) {
      console.error("Failed installing pandoc/tectonic via apt-get.");
      process.exit(1);
    }
    return;
  }

  if (has("dnf")) {
    const ok = run("bash", ["-lc", "sudo dnf install -y pandoc tectonic"]);
    if (!ok) {
      console.error("Failed installing pandoc/tectonic via dnf.");
      process.exit(1);
    }
    return;
  }

  console.error("Unsupported Linux package manager. Install pandoc and tectonic manually.");
  process.exit(1);
};

const main = () => {
  if (process.platform === "darwin") {
    installMac();
  } else if (process.platform === "linux") {
    installLinux();
  } else {
    console.error("Unsupported OS for auto install. Install pandoc + tectonic manually.");
    process.exit(1);
  }

  const missing: string[] = [];
  if (!has("pandoc")) {
    missing.push("pandoc");
  }
  if (!has("tectonic") && !has("pdflatex") && !has("xelatex") && !has("lualatex")) {
    missing.push("latex-engine");
  }

  if (missing.length) {
    console.error(`Install finished but missing: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log("System deps installed: pandoc + LaTeX engine.");
};

main();
