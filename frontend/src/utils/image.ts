/** Şəkli kiçildib JPEG data-URL kimi qaytarır (server saxlanması üçün kiçik ölçü). */
export function fileToResizedDataUrl(file: File, max = 256, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Yalnız şəkil faylı.'));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > height && width > max) {
        height = Math.round((height * max) / width);
        width = max;
      } else if (height >= width && height > max) {
        width = Math.round((width * max) / height);
        height = max;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas xətası.'));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Şəkil oxuna bilmədi.'));
    img.src = url;
  });
}
