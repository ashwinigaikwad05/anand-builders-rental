/**
 * Utility to compress, crop, rotate, enhance, and convert image files / captures
 * to optimized base64 data URLs.
 * This keeps document sizes small (~50KB-120KB) so they can be saved reliably
 * in both Supabase table rows and browser storage without lagging or hitting quotas.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
}

export interface ImageCropRect {
  x: number; // 0.0 to 1.0 (relative) or absolute px
  y: number; // 0.0 to 1.0 (relative) or absolute px
  width: number;
  height: number;
}

export interface ProcessImageOptions {
  rotation?: number; // 0, 90, 180, 270 (degrees)
  flipHorizontal?: boolean;
  brightness?: number; // 1.0 is default (neutral)
  contrast?: number; // 1.0 is default (neutral)
  crop?: ImageCropRect; // Normalized (0 to 1) or px relative to rotated dimensions
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
}

/**
 * Loads an image from a data URL or blob URL into an HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image source.'));
    img.src = src;
  });
}

/**
 * Compresses an uploaded File into an optimized JPEG data URL
 */
export function compressAndReadFile(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.75 } = options;

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = async (e) => {
      try {
        const dataUrl = e.target?.result as string;
        const processed = await processImage(dataUrl, {
          maxWidth,
          maxHeight,
          quality,
        });
        resolve(processed);
      } catch (err) {
        reject(err);
      }
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Processes an image with rotation, flipping, document enhance filters (brightness & contrast),
 * cropping, and high-efficiency compression.
 */
export async function processImage(
  source: string | HTMLCanvasElement | HTMLImageElement,
  options: ProcessImageOptions = {}
): Promise<string> {
  const {
    rotation = 0,
    flipHorizontal = false,
    brightness = 1.0,
    contrast = 1.0,
    crop,
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.78,
  } = options;

  let imgElement: HTMLImageElement | HTMLCanvasElement;
  if (typeof source === 'string') {
    imgElement = await loadImage(source);
  } else {
    imgElement = source;
  }

  const srcWidth = imgElement.width;
  const srcHeight = imgElement.height;

  if (!srcWidth || !srcHeight) {
    throw new Error('Invalid image dimensions');
  }

  // 1. Create intermediate canvas to handle rotation & flipping
  const normalizedRot = ((rotation % 360) + 360) % 360;
  const isSwapped = normalizedRot === 90 || normalizedRot === 270;
  const rotatedWidth = isSwapped ? srcHeight : srcWidth;
  const rotatedHeight = isSwapped ? srcWidth : srcHeight;

  const rotCanvas = document.createElement('canvas');
  rotCanvas.width = rotatedWidth;
  rotCanvas.height = rotatedHeight;
  const rotCtx = rotCanvas.getContext('2d');
  if (!rotCtx) {
    throw new Error('Failed to create canvas 2D context');
  }

  rotCtx.save();
  rotCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
  rotCtx.rotate((normalizedRot * Math.PI) / 180);
  if (flipHorizontal) {
    rotCtx.scale(-1, 1);
  }
  rotCtx.drawImage(imgElement, -srcWidth / 2, -srcHeight / 2);
  rotCtx.restore();

  // 2. Determine crop region on the rotated canvas
  let cropX = 0;
  let cropY = 0;
  let cropWidth = rotatedWidth;
  let cropHeight = rotatedHeight;

  if (crop) {
    // If values are <= 1, treat as normalized fractions (0.0 - 1.0)
    if (crop.width <= 1 && crop.height <= 1) {
      cropX = Math.round(crop.x * rotatedWidth);
      cropY = Math.round(crop.y * rotatedHeight);
      cropWidth = Math.round(crop.width * rotatedWidth);
      cropHeight = Math.round(crop.height * rotatedHeight);
    } else {
      cropX = Math.round(crop.x);
      cropY = Math.round(crop.y);
      cropWidth = Math.round(crop.width);
      cropHeight = Math.round(crop.height);
    }
  }

  // Bound checks
  cropX = Math.max(0, Math.min(cropX, rotatedWidth - 10));
  cropY = Math.max(0, Math.min(cropY, rotatedHeight - 10));
  cropWidth = Math.max(10, Math.min(cropWidth, rotatedWidth - cropX));
  cropHeight = Math.max(10, Math.min(cropHeight, rotatedHeight - cropY));

  // 3. Compute final scaled output dimensions
  let finalWidth = cropWidth;
  let finalHeight = cropHeight;

  if (finalWidth > maxWidth || finalHeight > maxHeight) {
    if (finalWidth / finalHeight > maxWidth / maxHeight) {
      finalHeight = Math.round((finalHeight * maxWidth) / finalWidth);
      finalWidth = maxWidth;
    } else {
      finalWidth = Math.round((finalWidth * maxHeight) / finalHeight);
      finalHeight = maxHeight;
    }
  }

  // 4. Render to final canvas with brightness and contrast filters
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = finalWidth;
  finalCanvas.height = finalHeight;
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) {
    return rotCanvas.toDataURL('image/jpeg', quality);
  }

  // Fill pure white background
  finalCtx.fillStyle = '#FFFFFF';
  finalCtx.fillRect(0, 0, finalWidth, finalHeight);

  // Apply visual brightness & contrast enhancements if specified
  const applyFilter = brightness !== 1.0 || contrast !== 1.0;
  if (applyFilter && 'filter' in finalCtx) {
    finalCtx.filter = `brightness(${brightness}) contrast(${contrast})`;
  }

  finalCtx.drawImage(
    rotCanvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    finalWidth,
    finalHeight
  );

  return finalCanvas.toDataURL('image/jpeg', quality);
}
