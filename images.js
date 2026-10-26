// images.js: shrinks photos before they are stored, so they don't fill up your phone.

const MAX_FILE_MB = 30;

// Returns a smaller JPEG copy of an image (Blob or File).
export async function resizeImage(file, maxSide, quality = 0.8) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      throw new Error("Couldn't read that image. Try a JPEG or PNG.");
    }
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        b => (b ? resolve(b) : reject(new Error("Couldn't process that image."))),
        'image/jpeg', quality);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Makes the two copies we store: a full-size photo and a small thumbnail.
export async function makePhotoPair(file) {
  if (!file.type.startsWith('image/')) throw new Error('Pick an image file.');
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    throw new Error(`That image is bigger than ${MAX_FILE_MB} MB.`);
  }
  const blob = await resizeImage(file, 1600, 0.8);
  const thumb = await resizeImage(blob, 240, 0.7);
  return { blob, thumb };
}
