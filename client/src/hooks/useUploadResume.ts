import { useState } from "react";

import { uploadResume } from "../lib/api";
import { UploadResumeResponse } from "../lib/types";

export const useUploadResume = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runUpload = async (file: File): Promise<UploadResumeResponse | null> => {
    setIsLoading(true);
    setError(null);
    try {
      return await uploadResume(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload resume");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, error, runUpload };
};
