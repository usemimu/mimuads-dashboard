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
