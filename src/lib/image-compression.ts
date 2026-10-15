/**
 * Client-Side Image Compression Helper
 * Uses HTML5 <canvas> to resize and compress photos before upload,
 * keeping photos around ~100KB and preserving the 1GB Supabase free tier storage.
 */

export interface CompressionOptions {
  maxWidth?: number;
  quality?: number; // 0.1 to 1.0 (default 0.7)
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const { maxWidth = 1000, quality = 0.7 } = options;

  // If not an image, return original
  if (!file.type.startsWith("image/")) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        // Resize proportionally if width exceeds maxWidth
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file); // Fallback to original if context not available
          return;
        }

        // Use high quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            // Create a standardized jpeg file
            const cleanName = file.name.replace(/\.[^/.]+$/, "");
            const compressedFile = new File([blob], `${cleanName}.jpg`, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = (err) => {
        console.error("Image load error during compression:", err);
        resolve(file); // Fallback
      };

      if (event.target?.result) {
        img.src = event.target.result as string;
      } else {
        resolve(file);
      }
    };

    reader.onerror = (err) => {
      console.error("FileReader error during compression:", err);
      resolve(file); // Fallback
    };

    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
