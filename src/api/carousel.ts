import { api } from './client'
import {
  CreateCarouselResponseSchema,
  CarouselItemUploadIntentResponseSchema,
  ConfirmCarouselResponseSchema,
} from './contracts/carousel'
import { probeCreative, sha256Hex, putToPresigned, putBlobToPresigned, capturePosterFrame } from './creatives'

// ── raw endpoints ────────────────────────────────────────────────────────────
export function createCarousel(name?: string) {
  return api.post('/advertiser/creatives/carousel', { name }, CreateCarouselResponseSchema)
}
export function carouselItemIntent(carouselId: string, input: unknown) {
  return api.post(
    `/advertiser/creatives/carousel/${carouselId}/items/upload-intent`,
    input,
    CarouselItemUploadIntentResponseSchema,
  )
}
export function confirmCarouselItem(carouselId: string, itemId: string, sha256Hash: string) {
  return api.post(`/advertiser/creatives/carousel/${carouselId}/items/${itemId}/confirm`, { sha256Hash })
}
export function deleteCarouselItem(carouselId: string, itemId: string) {
  return api.del(`/advertiser/creatives/carousel/${carouselId}/items/${itemId}`)
}
export function reorderCarousel(carouselId: string, itemIds: string[]) {
  return api.patch(`/advertiser/creatives/carousel/${carouselId}/reorder`, { itemIds })
}
export function confirmCarousel(carouselId: string) {
  return api.post(`/advertiser/creatives/carousel/${carouselId}/confirm`, {}, ConfirmCarouselResponseSchema)
}

// ── blurred-fill compose ─────────────────────────────────────────────────────
const TARGET_W = 1920
const TARGET_H = 1080
// Below this width/height ratio a frame would pillarbox noticeably on a 16:9
// screen, so we compose an Instagram-style landscape frame instead.
const LANDSCAPE_RATIO_MIN = 1.55

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

/**
 * Turn a portrait/off-ratio image into a full 1920×1080 frame: a blurred,
 * cover-scaled copy of itself as the background with the sharp image centered
 * (contain-fit) on top — so it fills the screen with no black bars. A frame
 * that's already ~landscape (≥16:9-ish) is returned as-is (no re-encode).
 * Returns the bytes to upload + the resolution string for the upload intent.
 */
export async function composeFrameForScreen(
  file: File,
): Promise<{ blob: Blob; resolution: string; composed: boolean }> {
  const img = await loadImage(file)
  const ratio = img.width / img.height
  if (ratio >= LANDSCAPE_RATIO_MIN) {
    return { blob: file, resolution: `${img.width}x${img.height}`, composed: false }
  }
  const canvas = document.createElement('canvas')
  canvas.width = TARGET_W
  canvas.height = TARGET_H
  const ctx = canvas.getContext('2d')!
  // Background: cover-fill + blur.
  const cover = Math.max(TARGET_W / img.width, TARGET_H / img.height)
  const bw = img.width * cover
  const bh = img.height * cover
  ctx.filter = 'blur(28px)'
  ctx.drawImage(img, (TARGET_W - bw) / 2, (TARGET_H - bh) / 2, bw, bh)
  ctx.filter = 'none'
  // Slight dark scrim so the sharp foreground reads against a busy blur.
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.fillRect(0, 0, TARGET_W, TARGET_H)
  // Foreground: contain-fit, centered, sharp.
  const fit = Math.min(TARGET_W / img.width, TARGET_H / img.height)
  const fw = img.width * fit
  const fh = img.height * fit
  ctx.drawImage(img, (TARGET_W - fw) / 2, (TARGET_H - fh) / 2, fw, fh)
  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.9))
  return { blob, resolution: `${TARGET_W}x${TARGET_H}`, composed: true }
}

// ── per-frame orchestrator ───────────────────────────────────────────────────
export interface UploadedFrame {
  itemId: string
  format: 'image' | 'video'
  filename: string
  dwellSeconds: number
  composed: boolean
}

/**
 * Upload one carousel frame end-to-end: (images) compose to a landscape frame if
 * needed → probe → intent → PUT bytes (+ poster for video) → confirm.
 */
export async function uploadCarouselFrame(
  carouselId: string,
  file: File,
  dwellSeconds: number,
): Promise<UploadedFrame> {
  const isVideo = file.type.startsWith('video')
  const format: 'image' | 'video' = isVideo ? 'video' : 'image'

  let body: Blob = file
  let resolution: string | undefined
  let composed = false
  let durationSeconds: number | undefined
  const contentType = isVideo ? (file.type as 'video/mp4') : 'image/jpeg'

  if (isVideo) {
    const meta = await probeCreative(file)
    durationSeconds = meta.durationSeconds
    resolution = meta.resolution
  } else {
    const c = await composeFrameForScreen(file)
    body = c.blob
    resolution = c.resolution
    composed = c.composed
  }

  const intent = await carouselItemIntent(carouselId, {
    filename: file.name,
    format,
    sizeBytes: body.size,
    dwellSeconds,
    durationSeconds,
    resolution,
    contentType,
  })

  await putBlobToPresigned(intent.presignedUrl, body, contentType)

  // Video poster (best-effort), if the backend handed us an upload slot.
  if (isVideo && intent.posterUpload) {
    const poster = await capturePosterFrame(file)
    if (poster) await putBlobToPresigned(intent.posterUpload.presignedUrl, poster, 'image/jpeg')
  }

  const sha = await sha256HexOfBlob(body)
  await confirmCarouselItem(carouselId, intent.itemId, sha)

  return { itemId: intent.itemId, format, filename: file.name, dwellSeconds, composed }
}

/** SHA-256 of a Blob as lowercase hex (Blob variant of creatives.sha256Hex). */
async function sha256HexOfBlob(blob: Blob): Promise<string> {
  if (blob instanceof File) return sha256Hex(blob)
  const buf = await blob.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// re-export for callers that only import from here
export { putToPresigned }
