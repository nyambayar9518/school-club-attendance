import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || "attendance-photos";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (bucket !== "avatars" && bucket !== "attendance-photos") {
      return NextResponse.json({ error: "Invalid bucket specified" }, { status: 400 });
    }

    // Convert File to ArrayBuffer and Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create unique file name
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const fileName = `${timestamp}-${randomStr}.jpg`;

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.error("Storage upload error:", error);
      return NextResponse.json(
        { error: `Upload error: ${error.message}` },
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
