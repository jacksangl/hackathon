import { useEffect, useRef, useState } from "react";

import { rewriteText } from "../lib/api";
import { RewriteResponse } from "../lib/types";

export const useDebouncedSuggestions = (params: {
  resumeId: string | null;
  section: string;
  text: string;
  jobDescriptionText: string;
  enabled: boolean;
  delayMs?: number;
}) => {
  const [data, setData] = useState<RewriteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);

  useEffect(() => {
    if (!params.enabled || !params.resumeId || !params.text.trim() || params.jobDescriptionText.length < 20) {
      setData(null);
      return;
    }

    const localSequence = ++sequence.current;

    const handle = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await rewriteText({
          resumeId: params.resumeId!,
          section: params.section,
          text: params.text,
          jobDescriptionText: params.jobDescriptionText,
          mode: "inline",
        });

        if (localSequence === sequence.current) {
          setData(result);
        }
      } catch (err) {
        if (localSequence === sequence.current) {
          setError(err instanceof Error ? err.message : "Failed to fetch inline suggestions");
        }
      } finally {
        if (localSequence === sequence.current) {
          setIsLoading(false);
        }
      }
    }, params.delayMs ?? 900);

    return () => {
      window.clearTimeout(handle);
    };
  }, [
    params.delayMs,
    params.enabled,
    params.jobDescriptionText,
    params.resumeId,
    params.section,
    params.text,
  ]);

  return {
    data,
    isLoading,
    error,
  };
};
