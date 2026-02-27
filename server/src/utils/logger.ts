export const logger = {
  info: (message: string, context?: unknown) => {
    if (context) {
      console.log(`[INFO] ${message}`, context);
      return;
    }
    console.log(`[INFO] ${message}`);
  },
  warn: (message: string, context?: unknown) => {
    if (context) {
      console.warn(`[WARN] ${message}`, context);
      return;
    }
    console.warn(`[WARN] ${message}`);
  },
  error: (message: string, context?: unknown) => {
    if (context) {
      console.error(`[ERROR] ${message}`, context);
      return;
    }
    console.error(`[ERROR] ${message}`);
  },
};
