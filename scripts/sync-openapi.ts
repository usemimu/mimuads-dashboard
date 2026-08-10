/**
 * Refresh the committed OpenAPI snapshot the contract drift-check runs against.
 *
 *   OPENAPI_URL=http://localhost:8000/openapi.json pnpm contracts:sync
 *
 * Run this whenever the backend legitimately changes a shape the console consumes,
 * then re-run the drift test and update the console zod contracts to match.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const url = process.env.OPENAPI_URL ?? 'http://localhost:8000/openapi.json'
const out = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../src/api/contracts/openapi.snapshot.json',
)

async function main() {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`)
  const json = await res.json()
  writeFileSync(out, JSON.stringify(json, null, 2) + '\n')
  const count = Object.keys(json?.components?.schemas ?? {}).length
  console.log(`✓ Wrote ${out} (${count} component schemas) from ${url}`)
}

main().catch((e) => {
  console.error('contracts:sync failed:', e instanceof Error ? e.message : e)
  process.exit(1)
})
