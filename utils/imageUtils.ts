export const cropImage = async (
  imageBlob: Blob, 
  box: [number, number, number, number], 
  format: 'image/png' | 'image/jpeg' = 'image/png',
  quality: number = 0.9,
  padding: number = 20
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      const [ymin, xmin, ymax, xmax] = box;

      // Convert 0-1000 scale to pixels
      const x1 = Math.max(0, (xmin / 1000) * w - padding);
      const y1 = Math.max(0, (ymin / 1000) * h - padding);
      const x2 = Math.min(w, (xmax / 1000) * w + padding);
      const y2 = Math.min(h, (ymax / 1000) * h + padding);

      const width = x2 - x1;
      const height = y2 - y1;

      if (width <= 0 || height <= 0) {
        // Fallback to original if crop is invalid
        resolve(imageBlob);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error("Context error"));
        return;
      }

      ctx.drawImage(img, x1, y1, width, height, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Crop failed"));
      }, format, quality);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(imageBlob);
  });
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data:image/png;base64, prefix
      resolve(base64String.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};