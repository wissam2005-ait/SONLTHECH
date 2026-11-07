/** Réduit une photo (téléphone = plusieurs Mo) en JPEG de 1600 px max et renvoie le base64 sans préfixe. */
export async function photoToBase64(file: File, maxSide = 1600, quality = 0.8): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error(`« ${file.name} » n’est pas une image.`)
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Impossible de traiter la photo.')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error(`Impossible de traiter « ${file.name} ».`)
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(new Error('Lecture de la photo impossible.'))
    reader.readAsDataURL(blob)
  })
}
