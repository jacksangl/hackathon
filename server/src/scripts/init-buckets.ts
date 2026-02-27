import { env } from "../config";
import { ensureRequiredBuckets } from "../services/storage.service";

const main = async () => {
  await ensureRequiredBuckets();
  console.log(
    `Buckets ready: ${env.SUPABASE_BUCKET_INPUT}, ${env.SUPABASE_BUCKET_OUTPUT}`,
  );
};

main().catch((error) => {
  console.error("Failed to initialize buckets", error);
  process.exit(1);
});
