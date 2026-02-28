import { app } from "./app";
import { env } from "./config";
import { logger } from "./utils/logger";
import { getMissingDeps, getSystemDepsStatus } from "./utils/systemDeps";

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);

  const status = getSystemDepsStatus();
  const missing = getMissingDeps(status);
  if (missing.length) {
    logger.warn(
      `Missing system deps for full export: ${missing.join(
        ", ",
      )}. Run: pnpm --filter resume-copilot-server deps:install`,
    );
  }
});
