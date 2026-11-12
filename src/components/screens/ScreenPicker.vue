<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { PhMagnifyingGlass } from '@phosphor-icons/vue'
import { listScreens } from '@/api/screens'
import { isOnline, type Screen } from '@/api/contracts/screens'
import { useSession } from '@/stores/session'
import { ctxKey } from '@/lib/ctx-key'
import { formatKobo } from '@/lib/money'
import { VENUE_TYPES, LAGOS_LGAS, mergeOptions } from '@/lib/taxonomy'
import ScreensMap from '@/components/screens/ScreensMap.vue'

/**
 * Inline screen picker for the campaign wizard. Mirrors the mobile campaign
 * flow (`create_screens_screen.dart` → `availableScreensProvider`): fetch
 * bookable inventory from the screens LIST endpoint filtered to `status:
 * 'active'` (NOT `/screens/map`, which also returns offline screens you can't
 * run on). Two-way binds the chosen IDs; the wizard writes them into `screenIds`.
 */
const selected = defineModel<string[]>({ required: true })

const session = useSession()

const search = ref('')
const lga = ref('')
const venueType = ref('')

const filters = computed(() => ({
  lga: lga.value || undefined,
  venueType: venueType.value || undefined,
  search: search.value || undefined,
}))

const { data, isLoading } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'screens', 'picker', JSON.stringify(filters.value))),
  // status: 'active' + limit 100 matches the mobile campaign picker exactly.
  queryFn: () => listScreens({ ...filters.value, status: 'active', limit: 100 }),
})

const allScreens = computed<Screen[]>(() => data.value?.screens ?? [])
// Same canonical LGA / venue-type vocabulary as the Screens page + admin.
const lgaOptions = computed(() => mergeOptions(LAGOS_LGAS, allScreens.value.map((s) => s.lga)))
const venueOptions = computed(() => mergeOptions(VENUE_TYPES, allScreens.value.map((s) => s.venueType)))

// Every screen here is active/bookable; no client-side status filtering needed.
const filtered = computed(() => allScreens.value)

// Keep a lookup of every screen we've loaded so the reach total survives
// filter changes (a selected screen may be filtered out of the current view).
const known = new Map<string, Screen>()
function remember(list: Screen[]) {
  for (const s of list) known.set(s.id, s)
}
const selectedReach = computed(() => {
  remember(allScreens.value)
  return selected.value.reduce((sum, id) => sum + (known.get(id)?.estimatedDailyReach ?? 0), 0)
})

function has(id: string): boolean {
  return selected.value.includes(id)
}
function toggle(s: Screen) {
  if (!session.canMutate) return
  known.set(s.id, s)
  selected.value = has(s.id) ? selected.value.filter((x) => x !== s.id) : [...selected.value, s.id]
}
function selectAllVisible() {
  const ids = new Set(selected.value)
  for (const s of filtered.value) {
    ids.add(s.id)
    known.set(s.id, s)
  }
  selected.value = [...ids]
}
function clearAll() {
  selected.value = []
}
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-line">
    <!-- Filter row -->
    <div class="flex flex-wrap items-center gap-2 border-b border-line bg-surface-sunken p-2.5">
      <div class="relative min-w-[9rem] flex-1">
        <PhMagnifyingGlass :size="15" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input v-model="search" :placeholder="$t('screens.search')" class="input py-1.5 pl-8 text-sm" />
      </div>
      <select v-model="lga" :aria-label="$t('nav.screens')" class="select w-auto py-1.5 text-sm">
        <option value="">{{ $t('screens.allLgas') }}</option>
        <option v-for="l in lgaOptions" :key="l" :value="l">{{ l }}</option>
      </select>
      <select v-model="venueType" :aria-label="$t('screens.status')" class="select w-auto py-1.5 text-sm">
        <option value="">{{ $t('screens.allVenues') }}</option>
        <option v-for="v in venueOptions" :key="v" :value="v">{{ v }}</option>
      </select>
    </div>

    <!-- Map -->
    <div class="h-56 border-b border-line bg-surface-sunken">
      <ScreensMap :screens="filtered" :selected-ids="selected" @select="toggle" />
    </div>

    <!-- List -->
    <div class="max-h-72 overflow-auto">
      <p v-if="isLoading" class="px-4 py-6 text-center text-sm text-neutral-400">{{ $t('common.loading') }}</p>
      <p v-else-if="!filtered.length" class="px-4 py-6 text-center text-sm text-neutral-400">
        {{ $t('screens.resultCount', { count: 0 }) }}
      </p>
      <ul v-else class="divide-y divide-line">
        <li v-for="s in filtered" :key="s.id" class="flex items-center gap-3 px-3 py-2 hover:bg-neutral-50">
          <span class="inline-block h-2 w-2 shrink-0 rounded-full" :class="isOnline(s.status) ? 'bg-moss-500' : 'bg-neutral-400'" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-neutral-900">{{ s.name }}</p>
            <p class="truncate text-xs capitalize text-neutral-500">{{ s.lga }} · {{ s.venueType }}</p>
          </div>
          <span class="shrink-0 font-mono text-xs text-neutral-500">{{ s.basePriceKobo ? formatKobo(s.basePriceKobo) : '—' }}</span>
          <button
            class="shrink-0 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors"
            :class="has(s.id) ? 'border-clay-500 bg-clay-50 text-clay-700' : 'border-line-strong text-neutral-600 hover:bg-neutral-100'"
            @click="toggle(s)"
          >
            {{ has(s.id) ? $t('screens.added') : $t('screens.add') }}
          </button>
        </li>
      </ul>
    </div>

    <!-- Selection summary -->
    <div class="flex items-center gap-3 border-t border-line bg-surface-sunken px-3 py-2 text-sm">
      <span class="font-semibold text-neutral-900" data-testid="picker-count">{{ $t('screens.resultCount', { count: selected.length }) }}</span>
      <span class="text-neutral-500">{{ $t('screens.estReach') }}: <span class="font-mono">{{ selectedReach.toLocaleString() }}</span></span>
      <div class="ml-auto flex items-center gap-3">
        <button class="text-clay-600 hover:underline" @click="selectAllVisible">{{ $t('screens.selectLga') }}</button>
        <button v-if="selected.length" class="text-neutral-500 hover:text-clay-600" @click="clearAll">{{ $t('screens.clearSelection') }}</button>
      </div>
    </div>
  </div>
</template>
