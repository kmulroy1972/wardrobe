// Downscale a photo client-side before upload so iPhone shots don't eat
// storage. Returns a JPEG blob, longest edge <= max.
export async function processPhoto(file, max = 1200) {
  const bitmap = await loadImage(file)
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not process the photo'))),
      'image/jpeg',
      0.85,
    )
  })
}

async function loadImage(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file)
    } catch {
      // fall through to <img> loading (e.g. unsupported format path)
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read the photo'))
    img.src = URL.createObjectURL(file)
  })
}
