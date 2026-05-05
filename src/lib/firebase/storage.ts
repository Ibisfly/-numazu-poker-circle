import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { app } from './config'

export const storage = getStorage(app)

export const uploadShopImage = (
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> =>
  new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `shop-images/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const storageRef = ref(storage, path)
    const task = uploadBytesResumable(storageRef, file)

    task.on(
      'state_changed',
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
        onProgress?.(pct)
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        resolve(url)
      }
    )
  })

export const deleteShopImage = (url: string) => {
  try {
    const storageRef = ref(storage, url)
    return deleteObject(storageRef)
  } catch {
    // URL形式が違う場合は無視
    return Promise.resolve()
  }
}
