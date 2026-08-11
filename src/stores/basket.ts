import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Screen } from '@/api/contracts/screens'
import { totalReach } from '@/lib/screens'

/**
 * Screen basket (client-side, PRD §4.2). Holds the current selection to send into
 * the campaign wizard. Named saved sets persist in localStorage — NON-sensitive
 * reference data, so browser storage is fine here (unlike tokens; PRD §2). Per-org
 * server persistence is a committed fast-follow.
 */
const SETS_KEY = 'mimu.screenSets'

type SavedSet = { name: string; screenIds: string[] }

function loadSets(): SavedSet[] {
  try {
    const raw = localStorage.getItem(SETS_KEY)
    return raw ? (JSON.parse(raw) as SavedSet[]) : []
  } catch {
    return []
  }
}

export const useBasket = defineStore('basket', () => {
  // Keep the full Screen so we can show count + estimated reach without refetch.
  const items = ref<Map<string, Screen>>(new Map())
  const savedSets = ref<SavedSet[]>(loadSets())

  const list = computed(() => [...items.value.values()])
  const count = computed(() => items.value.size)
  const reach = computed(() => totalReach(list.value))
  const ids = computed(() => [...items.value.keys()])

  function has(id: string): boolean {
    return items.value.has(id)
  }
  function add(screen: Screen): void {
    items.value.set(screen.id, screen)
  }
  function remove(id: string): void {
    items.value.delete(id)
  }
  function toggle(screen: Screen): void {
    if (has(screen.id)) remove(screen.id)
    else add(screen)
  }
  function addMany(screens: Screen[]): void {
    for (const s of screens) items.value.set(s.id, s)
  }
  function clear(): void {
    items.value.clear()
  }

  function persistSets(): void {
    try {
      localStorage.setItem(SETS_KEY, JSON.stringify(savedSets.value))
    } catch {
      /* storage unavailable — sets stay in memory for the session */
    }
  }
  function saveSet(name: string): void {
    if (!name.trim() || ids.value.length === 0) return
    savedSets.value = [
      ...savedSets.value.filter((s) => s.name !== name),
      { name, screenIds: ids.value },
    ]
    persistSets()
  }
  function deleteSet(name: string): void {
    savedSets.value = savedSets.value.filter((s) => s.name !== name)
    persistSets()
  }

  return {
    items,
    savedSets,
    list,
    count,
    reach,
    ids,
    has,
    add,
    remove,
    toggle,
    addMany,
    clear,
    saveSet,
    deleteSet,
  }
})
