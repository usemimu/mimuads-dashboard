import { dehydrate, hydrate, type QueryClient } from '@tanstack/vue-query'

/**
 * Package-free localStorage persistence for the QueryClient — the platform's
 * half of the offline/instant engine. On load we hydrate the last snapshot so
 * screens paint from cache immediately (then vue-query revalidates in the
 * background because staleTime has passed); if the network is down, the cached
 * data still shows.
 *
 * ISOLATION (§7.4): the cache is context-namespaced via ctxKey, but to be safe
 * against cross-user/-context leakage on a shared browser we HARD-CLEAR this
 * storage on logout and on org/workspace switch (see resetQueryCacheForContextSwitch
 * and the auth-failure handler). So a persisted snapshot never outlives the
 * session/context that produced it.
 */
const STORAGE_KEY = 'mimu-platform-query-cache-v1'
const SAVE_DEBOUNCE_MS = 1000
// Don't restore a snapshot older than this — stale beyond a day isn't worth it.
const MAX_AGE_MS = 24 * 60 * 60 * 1000

let saveTimer: ReturnType<typeof setTimeout> | null = null

/** Restore the last snapshot into the client. Call once, before mount. */
export function hydrateQueryCache(client: QueryClient): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as { ts: number; state: unknown }
    if (!parsed?.ts || Date.now() - parsed.ts > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    hydrate(client, parsed.state as never)
  } catch {
    // Corrupt/incompatible snapshot — drop it and start clean.
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }
}

/** Subscribe to cache changes and persist (debounced). Call once, after hydrate. */
export function startPersistingQueryCache(client: QueryClient): void {
  const save = () => {
    try {
      // dehydrate persists only successful queries by default — no in-flight
      // or errored state is written.
      const state = dehydrate(client)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: Date.now(), state }))
    } catch {
      /* quota / serialization issues are non-fatal — caching just degrades */
    }
  }
  client.getQueryCache().subscribe(() => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(save, SAVE_DEBOUNCE_MS)
  })
}

/** Wipe the persisted snapshot (logout / context switch). */
export function clearPersistedQueryCache(): void {
  try {
    if (saveTimer) clearTimeout(saveTimer)
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
