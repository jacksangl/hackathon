import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  DEMO_USER_ID: z.string().min(1),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-1.5-flash"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  SUPABASE_BUCKET_INPUT: z.string().min(1),
  SUPABASE_BUCKET_OUTPUT: z.string().min(1),
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  SUPABASE_SERVICE_ROLE_KEY:
    parsed.SUPABASE_SERVICE_ROLE_KEY ?? parsed.SUPABASE_SECRET_KEY ?? "",
};

if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing Supabase service key. Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY.",
  );
}
