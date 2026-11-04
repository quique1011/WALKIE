/**
 * Utilidad para comprimir y redimensionar imágenes en el navegador antes de enviarlas
 * o guardarlas en base64, evitando errores de PayloadTooLarge y saturación de memoria.
 */
export async function compressImageFile(file: File, maxDimension = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => {
      resolve('');
    };

    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (!src) {
        resolve('');
        return;
      }

      // Si no es imagen, retornar la cadena original
      if (!file.type.startsWith('image/')) {
        resolve(src);
        return;
      }

      const img = new Image();
      img.onerror = () => {
        resolve(src); // Fallback a imagen original si falla carga
      };

      img.onload = () => {
        try {
          let { width, height } = img;

          // Redimensionar si supera la dimensión máxima manteniendo la proporción
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(src);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch {
          resolve(src);
        }
      };

      img.src = src;
    };

    reader.readAsDataURL(file);
  });
}
