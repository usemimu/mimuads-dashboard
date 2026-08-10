import { QueryClient } from '@tanstack/vue-query'

/**
 * The single QueryClient. Keys are context-namespaced via ctxKey() (src/lib/
 * ctx-key.ts); on an org/workspace switch we clear the cache entirely so no
 * prior-context data can ever surface — the isolation security property (§7.4).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

/** Purge all cached server state on context switch (zero cross-context leakage). */
export function resetQueryCacheForContextSwitch(): void {
  queryClient.cancelQueries()
  queryClient.clear()
}
