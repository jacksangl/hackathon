import { useCallback, useEffect, useState } from "react";

import { getResumeVersions } from "../lib/api";
import { ResumeVersionsResponse } from "../lib/types";

export const useResumeVersions = (resumeId: string | null) => {
  const [data, setData] = useState<ResumeVersionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    if (!resumeId) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const next = await getResumeVersions(resumeId);
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch resume versions");
    } finally {
      setIsLoading(false);
    }
  }, [resumeId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchVersions,
  };
};
