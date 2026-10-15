import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

// Standard browser/client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client (uses service role if available for reliable administrative actions)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Uploads a file (File or Blob) to a Supabase Storage bucket and returns its public URL
 */
export async function uploadToStorage(
  bucket: "avatars" | "attendance-photos",
  path: string,
  file: File | Blob
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: "image/jpeg",
  });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return publicUrl;
}
