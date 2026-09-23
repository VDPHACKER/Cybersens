/**
 * Utility functions for client-side image processing, compression, and validation.
 * Resizes large photos from smartphones/webcams down to lightweight avatars (~15-20KB)
 * to safely persist in browser localStorage without exceeding storage quotas.
 */

export const compressImageFile = (
  file: File,
  maxDimension = 256,
  quality = 0.85,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Validate mime type
    if (!file.type.startsWith('image/')) {
      reject(new Error("Le fichier sélectionné n'est pas une image valide."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire le fichier image.'));

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format d’image non supporté ou corrompu.'));

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate aspect ratio preserving dimensions
          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback to original data URL if 2D context fails
            resolve(e.target?.result as string);
            return;
          }

          // Use high quality image rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Export compressed JPEG data URL
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch (canvasErr) {
          // If canvas operations fail, resolve with raw data
          resolve(e.target?.result as string);
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Validates whether an image URL is reachable and loads properly.
 */
export const testImageUrl = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!url || !url.trim().startsWith('http')) {
      resolve(false);
      return;
    }
    const img = new Image();
    const timer = setTimeout(() => resolve(false), 5000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(true);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    img.src = url.trim();
  });
};
