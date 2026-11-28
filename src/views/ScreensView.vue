<script setup lang="ts">
import MimuIcon from '@/components/ui/MimuIcon.vue'
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import {
  PhMapTrifold,
  PhListBullets,
  PhDownloadSimple,
  PhFunnel,
  PhCaretDown,
  PhX,
  PhArrowRight,
} from '@phosphor-icons/vue'
import Button from '@/components/ui/Button.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ScreensMap from '@/components/screens/ScreensMap.vue'
import ScreenDetailDrawer from '@/components/screens/ScreenDetailDrawer.vue'
import { getScreensMap, listScreens } from '@/api/screens'
import { isOnline, type Screen } from '@/api/contracts/screens'
import { useRouter } from 'vue-router'
import { useSession } from '@/stores/session'
import { useBasket } from '@/stores/basket'
import { useWizard } from '@/stores/wizard'
import { ctxKey } from '@/lib/ctx-key'
import { formatKobo } from '@/lib/money'
import { applyClientFilters, screensToCsv } from '@/lib/screens'
import { VENUE_TYPES, LAGOS_LGAS, mergeOptions } from '@/lib/taxonomy'

const session = useSession()
const basket = useBasket()
const wizard = useWizard()
const router = useRouter()

function useInCampaign() {
  wizard.fromBasket(basket.ids)
  router.push('/campaigns/new')
}

// Server-side filters (lga/venueType/search) drive the query; online + band
// filters are applied client-side on the loaded set (no server support — flagged).
const search = ref('')
const lga = ref('')
const venueType = ref('')
const onlineOnly = ref(false)
const minReach = ref<number | null>(null)
const maxPriceNaira = ref<number | null>(null)
const view = ref<'map' | 'list'>('map')

// Floating-overlay UI state (mobile-style map with panels layered on top).
const filtersOpen = ref(true)
const basketOpen = ref(true)
const selectedId = ref<string | null>(null) // quick card on marker tap
const drawerId = ref<string | null>(null) // full detail drawer

const filters = computed(() => ({
  lga: lga.value || undefined,
  venueType: venueType.value || undefined,
  search: search.value || undefined,
}))

// Two sources, mirroring the mobile screens directory:
//  • MAP view → /advertiser/screens/map — GeoJSON, but the backend DROPS any
//    screen without coordinates (see screen.controller.ts), so it can only ever
//    plot located screens.
//  • LIST view → /advertiser/screens — the plain list, which returns EVERY
//    screen in the system (coordinates or not). This is what guarantees the
//    page shows all our inventory, not just the mapped subset.
const { data: mapData, isLoading: mapLoading } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'screens', 'map', JSON.stringify(filters.value))),
  queryFn: () => getScreensMap(filters.value),
})
const { data: listData, isLoading: listLoading } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'screens', 'list', JSON.stringify(filters.value))),
  queryFn: () => listScreens({ ...filters.value, limit: 100 }),
})

const mapScreens = computed<Screen[]>(() => mapData.value ?? [])
const listAll = computed<Screen[]>(() => listData.value?.screens ?? [])

// LGA/venue dropdowns = the canonical admin vocabulary, merged with any values
// actually present in inventory (so nothing is unfilterable). Built off the
// full list so options appear even for screens with no coordinates.
const lgaOptions = computed(() => mergeOptions(LAGOS_LGAS, listAll.value.map((s) => s.lga)))
const venueOptions = computed(() => mergeOptions(VENUE_TYPES, listAll.value.map((s) => s.venueType)))

/** Client-side band + online filters (no server support — done here). */
function applyBands(list: Screen[]): Screen[] {
  let out = applyClientFilters(list, {
    minReach: minReach.value ?? undefined,
    maxPriceKobo: maxPriceNaira.value != null ? maxPriceNaira.value * 100 : undefined,
  })
  if (onlineOnly.value) out = out.filter((s) => isOnline(s.status))
  return out
}

const filteredMap = computed(() => applyBands(mapScreens.value))
const filteredList = computed(() => applyBands(listAll.value))

// The set the "N screens" count, select-all and CSV act on = whatever view
// you're looking at.
const activeFiltered = computed(() => (view.value === 'map' ? filteredMap.value : filteredList.value))
const isLoading = computed(() => (view.value === 'map' ? mapLoading.value : listLoading.value))

// Detail lookups can resolve against either source (a mapped screen or a
// list-only one).
const screenById = computed(() => {
  const m = new Map<string, Screen>()
  for (const s of listAll.value) m.set(s.id, s)
  for (const s of mapScreens.value) m.set(s.id, s)
  return m
})

const activeFilterCount = computed(
  () =>
    [
      search.value,
      lga.value,
      venueType.value,
      onlineOnly.value ? '1' : '',
      minReach.value != null ? '1' : '',
      maxPriceNaira.value != null ? '1' : '',
    ].filter(Boolean).length,
)

const cardScreen = computed(() => (selectedId.value ? screenById.value.get(selectedId.value) ?? null : null))
const drawerScreen = computed(() => (drawerId.value ? screenById.value.get(drawerId.value) ?? null : null))

function clearFilters() {
  search.value = ''
  lga.value = ''
  venueType.value = ''
  onlineOnly.value = false
  minReach.value = null
  maxPriceNaira.value = null
}
function selectAllInLga() {
  if (!lga.value) return
  basket.addMany(activeFiltered.value.filter((s) => s.lga === lga.value))
}
function exportCsv() {
  const blob = new Blob([screensToCsv(activeFiltered.value)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mimu-screens-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const setName = ref('')
function saveSet() {
  basket.saveSet(setName.value)
  setName.value = ''
}
</script>

<template>
  <!-- Full-bleed map surface (breaks out of the page-body padding), with every
       control layered on top as floating panels — the mobile screens map,
       adapted for the desktop buying flow. -->
  <!-- Fills the floating content card: 100vh minus shell padding (24px),
       topbar (48px), the gap (12px) and the card border. -->
  <div class="relative -mx-6 -my-5 h-[calc(100vh-5.5rem)] overflow-hidden rounded-2xl bg-surface-sunken">
    <!-- Map -->
    <ScreensMap
      v-show="view === 'map'"
      class="absolute inset-0"
      :screens="filteredMap"
      :selected-ids="basket.ids"
      @select="(s) => (selectedId = s.id)"
    />

    <!-- List (overlays the map when toggled) -->
    <div v-show="view === 'list'" class="absolute inset-0 overflow-auto bg-[var(--bg)] p-6 pt-20">
      <div class="overflow-hidden rounded-xl border border-line bg-surface">
        <table class="w-full text-sm">
          <thead class="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            <tr>
              <th class="px-4 py-3">{{ $t('screens.venue') }}</th>
              <th class="hidden px-4 py-3 sm:table-cell">Location</th>
              <th class="px-4 py-3">{{ $t('screens.estReach') }}</th>
              <th class="hidden px-4 py-3 md:table-cell">Dwell</th>
              <th class="px-4 py-3">{{ $t('screens.basePrice') }}</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr v-if="!isLoading && !filteredList.length">
              <td colspan="6" class="px-4 py-14">
                <EmptyState sticker="screen-map" :title="$t('screens.noResults')" :message="$t('screens.noResultsHint')">
                  <template #icon><PhMapTrifold :size="24" /></template>
                  <template #actions>
                    <Button variant="outline" size="sm" @click="clearFilters">{{ $t('screens.clearFilters') }}</Button>
                  </template>
                </EmptyState>
              </td>
            </tr>
            <tr
              v-for="s in filteredList"
              :key="s.id"
              class="transition-colors hover:bg-surface-sunken/60"
              data-testid="screen-row"
            >
              <!-- Screen name + photo + address -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <!-- Small square chip → host logo (thumbnailUrl), matching the
                       pickers. The wide hero photo lives in the detail drawer. -->
                  <div class="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    <img v-if="s.thumbnailUrl" :src="s.thumbnailUrl" :alt="s.name" class="h-full w-full object-cover" />
                    <PhMapTrifold v-else :size="18" class="absolute inset-0 m-auto text-neutral-300" />
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <button
                        class="truncate text-left text-[13px] font-semibold text-neutral-900 hover:text-clay-600"
                        @click="drawerId = s.id"
                      >{{ s.name }}</button>
                      <span
                        class="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                        :class="isOnline(s.status) ? 'bg-moss-500' : 'bg-neutral-300'"
                      />
                    </div>
                    <p v-if="s.address" class="mt-0.5 max-w-[200px] truncate text-[11px] text-neutral-400">{{ s.address }}</p>
                  </div>
                </div>
              </td>
              <!-- Location: venue + LGA + type -->
              <td class="hidden px-4 py-3 sm:table-cell">
                <p class="text-[13px] font-medium text-neutral-700">{{ s.venueName }}</p>
                <p class="mt-0.5 text-[11px] capitalize text-neutral-400">{{ s.lga }} · {{ s.venueType }}</p>
              </td>
              <!-- Est. daily reach -->
              <td class="px-4 py-3">
                <p class="font-display text-[13px] font-medium text-neutral-900">
                  {{ s.estimatedDailyReach != null ? s.estimatedDailyReach.toLocaleString() : '—' }}
                </p>
                <p v-if="s.estimatedDailyReach != null" class="text-[11px] text-neutral-400">per day</p>
              </td>
              <!-- Avg dwell -->
              <td class="hidden px-4 py-3 md:table-cell">
                <p class="font-display text-[13px] font-medium text-neutral-900">
                  {{ s.averageAttentionSeconds != null ? s.averageAttentionSeconds + 's' : '—' }}
                </p>
                <p v-if="s.averageAttentionSeconds != null" class="text-[11px] text-neutral-400">avg dwell</p>
              </td>
              <!-- Rate / day -->
              <td class="px-4 py-3">
                <p class="font-display text-[13px] font-medium text-neutral-900">
                  {{ s.basePriceKobo ? formatKobo(s.basePriceKobo) : '—' }}
                </p>
                <p v-if="s.basePriceKobo" class="text-[11px] text-neutral-400">/ day</p>
              </td>
              <!-- Actions -->
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-2.5">
                  <button
                    class="text-xs text-neutral-400 transition-colors hover:text-clay-600"
                    @click="drawerId = s.id"
                  >{{ $t('screens.details') }}</button>
                  <button
                    v-if="session.canMutate"
                    class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
                    :class="basket.has(s.id)
                      ? 'border-clay-300/60 bg-clay-500/10 text-clay-600'
                      : 'border-line-strong text-neutral-500 hover:border-clay-400/60 hover:text-clay-600'"
                    @click="basket.toggle(s)"
                  >
                    {{ basket.has(s.id) ? $t('screens.added') : $t('screens.add') }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TOP-LEFT: Filters panel -->
    <div class="absolute left-4 top-4 z-[2] w-[280px] max-w-[calc(100%-2rem)]">
      <div class="overflow-hidden rounded-xl border border-line bg-surface/95 shadow-pop backdrop-blur">
        <button
          class="flex w-full items-center gap-2 px-3.5 py-2.5 text-left"
          @click="filtersOpen = !filtersOpen"
        >
          <PhFunnel :size="16" class="text-clay-600" />
          <span class="text-[13px] font-semibold text-neutral-900">{{ $t('screens.filters') }}</span>
          <span v-if="activeFilterCount" class="rounded-full bg-clay-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {{ activeFilterCount }}
          </span>
          <span class="ml-auto text-[11px] text-neutral-400" data-testid="result-count">
            {{ isLoading ? $t('common.loading') : $t('screens.resultCount', { count: activeFiltered.length }) }}
          </span>
          <PhCaretDown :size="14" class="shrink-0 text-neutral-400 transition-transform" :class="filtersOpen ? '' : '-rotate-90'" />
        </button>

        <div v-if="filtersOpen" class="max-h-[calc(100vh-11rem)] space-y-3 overflow-auto border-t border-line p-3.5">
          <input v-model="search" :placeholder="$t('screens.search')" class="input text-sm" />
          <select v-model="lga" :aria-label="$t('nav.screens')" class="input text-sm">
            <option value="">{{ $t('screens.allLgas') }}</option>
            <option v-for="l in lgaOptions" :key="l" :value="l">{{ l }}</option>
          </select>
          <select v-model="venueType" :aria-label="$t('screens.status')" class="input text-sm">
            <option value="">{{ $t('screens.allVenues') }}</option>
            <option v-for="v in venueOptions" :key="v" :value="v">{{ v }}</option>
          </select>
          <label class="flex items-center gap-2 text-sm text-neutral-700">
            <input v-model="onlineOnly" type="checkbox" class="rounded border-neutral-300 text-clay-500 focus:ring-clay-400" />
            {{ $t('screens.online') }}
          </label>
          <label class="block text-sm">
            <span class="mb-1 block text-xs font-medium text-neutral-500">{{ $t('screens.footfallBand') }}</span>
            <input v-model.number="minReach" type="number" min="0" class="input text-sm" />
          </label>
          <label class="block text-sm">
            <span class="mb-1 block text-xs font-medium text-neutral-500">{{ $t('screens.priceBand') }}</span>
            <input v-model.number="maxPriceNaira" type="number" min="0" class="input text-sm" />
          </label>
          <div class="flex flex-wrap gap-x-4 gap-y-1 pt-1">
            <button class="text-sm text-clay-600 hover:underline" @click="clearFilters">{{ $t('screens.clearFilters') }}</button>
            <button v-if="lga && session.canMutate" class="text-sm text-clay-600 hover:underline" @click="selectAllInLga">
              {{ $t('screens.selectLga') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TOP-RIGHT: view toggle + export -->
    <div class="absolute right-4 top-4 z-[2] flex items-center gap-2">
      <div class="flex rounded-full border border-line-strong bg-surface/95 p-0.5 shadow-card backdrop-blur">
        <button class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors" :class="view === 'map' ? 'bg-clay-500 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900'" @click="view = 'map'">
          <PhMapTrifold :size="15" /> {{ $t('screens.mapView') }}
        </button>
        <button class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors" :class="view === 'list' ? 'bg-clay-500 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900'" @click="view = 'list'">
          <PhListBullets :size="15" /> {{ $t('screens.listView') }}
        </button>
      </div>
      <Button variant="secondary" size="sm" class="shadow-card" @click="exportCsv">
        <PhDownloadSimple :size="16" /> {{ $t('screens.exportCsv') }}
      </Button>
    </div>

    <!-- BOTTOM-LEFT: selected screen quick card (mobile-style) -->
    <div v-if="cardScreen" class="absolute bottom-4 left-4 z-[2] w-[340px] max-w-[calc(100%-2rem)]">
      <div class="rounded-xl border border-line bg-surface p-4 shadow-pop">
        <div class="flex items-start gap-3">
          <MimuIcon name="screen" variant="sticker" :size="104" class="shrink-0" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="truncate font-body text-[15px] font-semibold text-neutral-900">{{ cardScreen.name }}</p>
              <span class="inline-block h-2 w-2 shrink-0 rounded-full" :class="isOnline(cardScreen.status) ? 'bg-moss-500' : 'bg-neutral-400'" />
            </div>
            <p class="truncate text-xs capitalize text-neutral-500">{{ cardScreen.lga }} · {{ cardScreen.venueType }}</p>
            <p v-if="cardScreen.basePriceKobo" class="mt-1 font-display text-sm font-semibold text-clay-700">
              {{ formatKobo(cardScreen.basePriceKobo) }}<span class="text-xs font-normal text-neutral-400"> / day</span>
            </p>
          </div>
          <button class="shrink-0 text-neutral-400 hover:text-neutral-700" @click="selectedId = null"><PhX :size="16" /></button>
        </div>
        <div class="mt-3 flex items-center gap-2">
          <Button
            v-if="session.canMutate"
            size="sm"
            :variant="basket.has(cardScreen.id) ? 'outline' : 'primary'"
            @click="basket.toggle(cardScreen)"
          >
            {{ basket.has(cardScreen.id) ? $t('screens.added') : $t('screens.add') }}
          </Button>
          <Button size="sm" variant="ghost" @click="drawerId = cardScreen.id">
            {{ $t('screens.details') }} <PhArrowRight :size="14" />
          </Button>
        </div>
      </div>
    </div>

    <!-- BOTTOM-RIGHT: Selection basket -->
    <div class="absolute bottom-4 right-4 z-[2] w-[260px] max-w-[calc(100%-2rem)]">
      <div class="overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
        <button class="flex w-full items-center gap-2 px-3.5 py-2.5 text-left" @click="basketOpen = !basketOpen">
          <span class="text-[13px] font-semibold text-neutral-900">{{ $t('screens.basket') }}</span>
          <span class="rounded-full bg-clay-500 px-1.5 py-0.5 text-[10px] font-bold text-white" data-testid="basket-count">
            {{ basket.count }}
          </span>
          <PhCaretDown :size="14" class="ml-auto shrink-0 text-neutral-400 transition-transform" :class="basketOpen ? '' : '-rotate-90'" />
        </button>

        <div v-if="basketOpen" class="space-y-3 border-t border-line p-3.5">
          <div class="rounded-lg bg-surface-sunken p-3">
            <p class="text-xs text-neutral-500">{{ $t('screens.estReach') }}</p>
            <p class="font-display text-xl font-semibold text-neutral-900">{{ basket.reach }}</p>
          </div>
          <p v-if="basket.count === 0" class="text-sm text-neutral-400">{{ $t('screens.basketEmpty') }}</p>
          <template v-else>
            <div class="flex gap-2">
              <input v-model="setName" :placeholder="$t('screens.setName')" :aria-label="$t('screens.setName')" class="input text-sm" />
              <Button size="sm" variant="secondary" @click="saveSet">{{ $t('common.save') }}</Button>
            </div>
            <div class="flex items-center gap-3">
              <Button v-if="session.canSubmitCampaign" class="flex-1" size="sm" @click="useInCampaign">{{ $t('screens.useInCampaign') }}</Button>
              <button class="text-sm text-neutral-500 hover:text-clay-600" @click="basket.clear()">{{ $t('screens.clearSelection') }}</button>
            </div>
          </template>
          <div v-if="basket.savedSets.length" class="border-t border-line pt-2">
            <p class="mb-1 text-[10px] uppercase tracking-wide text-neutral-400">{{ $t('screens.savedSets') }}</p>
            <ul class="space-y-1">
              <li v-for="st in basket.savedSets" :key="st.name" class="flex items-center justify-between text-sm">
                <span class="truncate text-neutral-700">{{ st.name }} ({{ st.screenIds.length }})</span>
                <button class="text-neutral-400 hover:text-clay-600" @click="basket.deleteSet(st.name)">×</button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Full detail drawer -->
    <ScreenDetailDrawer v-if="drawerId" :screen-id="drawerId" :summary="drawerScreen" @close="drawerId = null" />
  </div>
</template>
