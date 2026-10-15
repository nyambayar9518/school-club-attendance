"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";

interface ImageModalProps {
  imageUrl: string | null;
  altText: string;
  onClose: () => void;
}

export function ImageModal({ imageUrl, altText, onClose }: ImageModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative max-w-2xl w-full bg-white rounded-lg border border-zinc-200 overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 bg-zinc-50">
          <span className="text-xs font-medium text-zinc-600 truncate max-w-md">
            {altText}
          </span>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 rounded-md hover:bg-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Image content */}
        <div className="relative w-full h-[65vh] bg-zinc-950 flex items-center justify-center p-2">
          <Image
            src={imageUrl}
            alt={altText}
            fill
            sizes="(max-width: 768px) 100vw, 800px"
            className="object-contain"
            unoptimized
          />
        </div>
      </div>
    </div>
  );
}
