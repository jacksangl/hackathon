import { env } from "../config";
import { ApiError } from "../utils/errors";
import { supabase } from "../db/supabase";

export const uploadInputFile = async (path: string, data: Buffer, contentType: string) => {
  const { error } = await supabase.storage
    .from(env.SUPABASE_BUCKET_INPUT)
    .upload(path, data, { contentType, upsert: true });

  if (error) {
    throw new ApiError(500, "Failed to upload input file", error);
  }
};

export const uploadOutputFile = async (path: string, data: Buffer, contentType: string) => {
  const { error } = await supabase.storage
    .from(env.SUPABASE_BUCKET_OUTPUT)
    .upload(path, data, { contentType, upsert: true });

  if (error) {
    throw new ApiError(500, "Failed to upload output file", error);
  }
};

export const getOutputSignedUrl = async (path: string, expiresIn = 3600) => {
  const { data, error } = await supabase.storage
    .from(env.SUPABASE_BUCKET_OUTPUT)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    throw new ApiError(500, "Failed to create signed download URL", error);
  }

  return data.signedUrl;
};
