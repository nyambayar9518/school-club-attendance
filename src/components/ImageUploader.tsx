"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { Camera, UploadCloud, X, CheckCircle, Loader2 } from "lucide-react";
import { compressImage, formatFileSize } from "@/lib/image-compression";

interface ImageUploaderProps {
  bucket: "avatars" | "attendance-photos";
  onUploaded: (url: string) => void;
  label?: string;
  required?: boolean;
}

export function ImageUploader({
  bucket,
  onUploaded,
  label = "Upload Photo",
  required = false,
}: ImageUploaderProps) {
  const [compressing, setCompressing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [compressionStats, setCompressionStats] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setCompressionStats(null);

    const originalSize = file.size;

    try {
      setCompressing(true);
      // Run client-side HTML5 canvas compression to max 1000px and 0.7 JPEG quality
      const compressedFile = await compressImage(file, {
        maxWidth: 1000,
        quality: 0.7,
      });

      const compressedSize = compressedFile.size;
      const reduction = Math.max(
        0,
        Math.round(((originalSize - compressedSize) / originalSize) * 100)
      );

      setCompressionStats(
        `${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (${reduction}% saved)`
      );

      // Create local preview
      const localPreview = URL.createObjectURL(compressedFile);
      setPreviewUrl(localPreview);
      setCompressing(false);

      // Upload compressed image to server storage endpoint
      setUploading(true);
      const formData = new FormData();
      formData.append("file", compressedFile);
      formData.append("bucket", bucket);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload image");
      }

      setUploadedUrl(data.url);
      onUploaded(data.url);
    } catch (err: any) {
      console.error("Image processing/upload failed:", err);
      setErrorMessage(err.message || "Failed to process photo");
      setPreviewUrl(null);
    } finally {
      setCompressing(false);
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setUploadedUrl(null);
    setCompressionStats(null);
    setErrorMessage(null);
    onUploaded("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-zinc-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {compressionStats && (
          <span className="text-[11px] font-mono text-zinc-500">
            {compressionStats}
          </span>
        )}
      </div>

      {!previewUrl ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-zinc-300 hover:border-zinc-400 bg-zinc-50 hover:bg-zinc-100/60 rounded-md p-4 text-center cursor-pointer transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-600">
              <Camera className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium text-zinc-700">
              Take photo or choose from library
            </p>
            <p className="text-[11px] text-zinc-500">
              Auto-compressed to ~100KB to save free storage
            </p>
          </div>
        </div>
      ) : (
        <div className="relative border border-zinc-200 rounded-md p-2 bg-white flex items-center gap-3">
          <div className="relative w-16 h-16 rounded border border-zinc-200 overflow-hidden flex-shrink-0 bg-zinc-100">
            <Image
              src={previewUrl}
              alt="Photo preview"
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
            />
          </div>

          <div className="flex-1 min-w-0">
            {compressing && (
              <p className="text-xs font-medium text-zinc-600 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Compressing
                image...
              </p>
            )}
            {uploading && (
              <p className="text-xs font-medium text-zinc-600 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading to
                storage...
              </p>
            )}
            {!compressing && !uploading && uploadedUrl && (
              <p className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> Ready for submission
              </p>
            )}
            {compressionStats && (
              <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                Optimized: {compressionStats}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
            title="Remove photo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <p className="text-xs text-red-600 font-medium">{errorMessage}</p>
      )}
    </div>
  );
}
