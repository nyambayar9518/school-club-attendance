import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Maximum allowable file size: 5MB (plenty for high-res 1200px photos, stops DoS bombs)
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Validates that binary file buffer matches genuine image magic bytes (not disguised scripts/HTML)
 */
function validateImageMagicBytes(buffer: Buffer): { valid: boolean; ext: string; contentType: string } {
  if (buffer.length < 12) {
    return { valid: false, ext: "", contentType: "" };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, ext: "jpg", contentType: "image/jpeg" };
  }

  // PNG: 89 50 4E 47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { valid: true, ext: "png", contentType: "image/png" };
  }

  // WebP: RIFF .... WEBP
  const riffHeader = buffer.subarray(0, 4).toString("ascii");
  const webpHeader = buffer.subarray(8, 12).toString("ascii");
  if (riffHeader === "RIFF" && webpHeader === "WEBP") {
    return { valid: true, ext: "webp", contentType: "image/webp" };
  }

  return { valid: false, ext: "", contentType: "" };
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    // Rate limiting: max 30 uploads per 10 minutes per IP
    const rl = await checkRateLimit(`upload:${ip}`, 30, 600);
    if (!rl.success) {
      return NextResponse.json(
        { error: `Upload rate limit exceeded. Please wait ${Math.ceil(rl.resetSeconds / 60)} minutes.` },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || "attendance-photos";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Only allow configured buckets
    if (bucket !== "avatars" && bucket !== "attendance-photos") {
      return NextResponse.json({ error: "Invalid storage bucket specified" }, { status: 400 });
    }

    // Authorization: attendance photos require an active user session
    if (bucket === "attendance-photos") {
      const user = await getSessionUser();
      if (!user) {
        return NextResponse.json(
          { error: "Authentication required to upload attendance photos" },
          { status: 401 }
        );
      }
    }

    // File size safety check
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Uploaded image exceeds the 5MB maximum size limit" },
        { status: 413 }
      );
    }

    // Convert File to Buffer for binary inspection
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Strict Magic-Bytes Verification
    const { valid, ext, contentType } = validateImageMagicBytes(buffer);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid image file format. Only verified JPEG, PNG, or WebP images are permitted." },
        { status: 400 }
      );
    }

    // Generate safe, unguessable file path
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    const fileName = `${timestamp}-${randomStr}.${ext}`;

    // Upload with service role key
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error("Storage upload error:", error);
      return NextResponse.json(
        { error: `Storage upload error: ${error.message}` },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucket).getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: data.path,
    });
  } catch (err: any) {
    console.error("Upload route exception:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process image upload" },
      { status: 500 }
    );
  }
}
