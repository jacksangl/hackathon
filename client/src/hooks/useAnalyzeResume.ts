import { useState } from "react";

import { analyzeResume } from "../lib/api";
import { AnalyzeResponse } from "../lib/types";

export const useAnalyzeResume = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalyze = async (payload: {
    resumeId: string;
    jobDescriptionText: string;
    jobTitle?: string;
    company?: string;
  }): Promise<AnalyzeResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      return await analyzeResume(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, error, runAnalyze };
};
