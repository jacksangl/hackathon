import { env } from "../config";
import { ApiError } from "../utils/errors";
import { supabase } from "../db/supabase";

const alreadyExists = (message: string) =>
  message.toLowerCase().includes("already exists") ||
  message.toLowerCase().includes("duplicate");

export const ensureBucketExists = async (bucketName: string) => {
  const { data, error } = await supabase.storage.getBucket(bucketName);

  if (data && !error) {
    return;
  }

  const notFound =
    error &&
    (error.message.toLowerCase().includes("not found") ||
      (typeof (error as { statusCode?: number }).statusCode === "number" &&
        (error as { statusCode?: number }).statusCode === 404));

  if (!notFound && error) {
    throw new ApiError(500, `Failed checking bucket "${bucketName}"`, error);
  }

  const { error: createError } = await supabase.storage.createBucket(bucketName, {
    public: false,
  });

  if (createError && !alreadyExists(createError.message)) {
    throw new ApiError(500, `Failed creating bucket "${bucketName}"`, createError);
  }
};

export const ensureRequiredBuckets = async () => {
  await ensureBucketExists(env.SUPABASE_BUCKET_INPUT);
  await ensureBucketExists(env.SUPABASE_BUCKET_OUTPUT);
};

export const uploadInputFile = async (path: string, data: Buffer, contentType: string) => {
  const { error } = await supabase.storage
    .from(env.SUPABASE_BUCKET_INPUT)
    .upload(path, data, { contentType, upsert: true });

  if (error) {
    throw new ApiError(500, "Failed to upload input file", error);
  }
};

export const downloadInputFile = async (path: string): Promise<Buffer> => {
  const { data, error } = await supabase.storage.from(env.SUPABASE_BUCKET_INPUT).download(path);

  if (error || !data) {
    const message = error?.message?.toLowerCase() ?? "";
    if (message.includes("not found")) {
      throw new ApiError(404, "Resume file not found in input bucket", error);
    }
    throw new ApiError(500, "Failed to download input file", error);
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  if (!buffer.length) {
    throw new ApiError(400, "Downloaded resume file is empty");
  }

  return buffer;
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
