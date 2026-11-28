import { QueryClient } from '@tanstack/vue-query'

import { clearPersistedQueryCache } from './query-persist'

/**
 * The single QueryClient. Keys are context-namespaced via ctxKey() (src/lib/
 * ctx-key.ts); on an org/workspace switch we clear the cache entirely so no
 * prior-context data can ever surface — the isolation security property (§7.4).
 *
 * gcTime is generous (1h) so warm queries survive navigation and feed the
 * localStorage snapshot (see query-persist.ts); staleTime keeps reads fresh by
 * revalidating in the background after 30s — the "instant then refresh" feel.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 60 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

/** Purge all cached server state on context switch (zero cross-context leakage). */
export function resetQueryCacheForContextSwitch(): void {
  queryClient.cancelQueries()
  queryClient.clear()
  // Also drop the on-disk snapshot so a switch can't rehydrate prior-context data.
  clearPersistedQueryCache()
}
