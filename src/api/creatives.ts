import { api } from './client'
import {
  UploadIntentSchema,
  UploadIntentResponseSchema,
  ConfirmUploadSchema,
  CreativeStatusResponseSchema,
  CreativeListResponseSchema,
  type UploadIntentRequest,
} from './contracts/creatives'

export function listCreatives() {
  return api.get('/advertiser/creatives', CreativeListResponseSchema)
}
export function getCreative(id: string) {
  return api.get(`/advertiser/creatives/${id}`, CreativeStatusResponseSchema)
}
export function uploadIntent(input: UploadIntentRequest) {
  return api.post('/advertiser/creatives/upload-intent', UploadIntentSchema.parse(input), UploadIntentResponseSchema)
}
export function confirmUpload(id: string, sha256Hash: string) {
  return api.post(
    `/advertiser/creatives/${id}/confirm`,
    ConfirmUploadSchema.parse({ sha256Hash }),
    CreativeStatusResponseSchema,
  )
}

/**
 * Read a creative File's metadata client-side. Videos MUST carry
 * `durationSeconds` (the backend rejects video uploads without it — 5–180s,
 * landscape only); we also read `resolution` so the server can reject portrait
 * early. Resolves to `{}` if the browser can't decode the file.
 */
export function probeCreative(
  file: File,
): Promise<{ durationSeconds?: number; resolution?: string }> {
  if (file.type.startsWith('video')) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.onloadedmetadata = () => {
        const durationSeconds = Number.isFinite(v.duration) ? Math.round(v.duration) : undefined
        const resolution = v.videoWidth && v.videoHeight ? `${v.videoWidth}x${v.videoHeight}` : undefined
        URL.revokeObjectURL(url)
        resolve({ durationSeconds, resolution })
      }
      v.onerror = () => {
        URL.revokeObjectURL(url)
        resolve({})
      }
      v.src = url
    })
  }
  if (file.type.startsWith('image')) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        const resolution = `${img.naturalWidth}x${img.naturalHeight}`
        URL.revokeObjectURL(url)
        resolve({ resolution })
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve({})
      }
      img.src = url
    })
  }
  return Promise.resolve({})
}

/** SHA-256 of a File as lowercase hex (for the confirm step). */
export async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** PUT the file to the presigned URL (S3). Presigned-POST form is not used here. */
export async function putToPresigned(url: string, file: File): Promise<void> {
  const res = await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
  if (!res.ok) throw new Error(`Upload failed (${res.status})`)
}

/** PUT a Blob (e.g. a generated poster) to a presigned URL with an explicit type. */
export async function putBlobToPresigned(url: string, blob: Blob, contentType: string): Promise<void> {
  const res = await fetch(url, { method: 'PUT', body: blob, headers: { 'Content-Type': contentType } })
  if (!res.ok) throw new Error(`Poster upload failed (${res.status})`)
}

/**
 * Capture a still frame (~`atSeconds` in, to skip black fade-ins) from a video
 * File as a JPEG Blob — the campaign poster the backend expects the client to
 * supply. Best-effort: resolves null if the browser can't decode/seek/encode,
 * in which case the caller just skips the poster (backend falls back to null).
 */
export function capturePosterFrame(file: File, atSeconds = 1): Promise<Blob | null> {
  if (!file.type.startsWith('video')) return Promise.resolve(null)
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.muted = true
    v.playsInline = true
    const done = (blob: Blob | null) => {
      URL.revokeObjectURL(url)
      resolve(blob)
    }
    v.onloadedmetadata = () => {
      // Seek a little in, but never past the end of a short clip.
      const t = Math.min(atSeconds, Math.max(0, (v.duration || 0) - 0.1))
      v.currentTime = Number.isFinite(t) ? t : 0
    }
    v.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = v.videoWidth
        canvas.height = v.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx || !canvas.width || !canvas.height) return done(null)
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => done(blob), 'image/jpeg', 0.82)
      } catch {
        done(null)
      }
    }
    v.onerror = () => done(null)
    v.src = url
  })
}
