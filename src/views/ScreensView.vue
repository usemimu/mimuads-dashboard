<script setup lang="ts">
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
import ScreensMap from '@/components/screens/ScreensMap.vue'
import ScreenDetailDrawer from '@/components/screens/ScreenDetailDrawer.vue'
import { getScreensMap } from '@/api/screens'
import { isOnline, type Screen } from '@/api/contracts/screens'
import { useRouter } from 'vue-router'
import { useSession } from '@/stores/session'
import { useBasket } from '@/stores/basket'
import { useWizard } from '@/stores/wizard'
import { ctxKey } from '@/lib/ctx-key'
import { formatKobo } from '@/lib/money'
import { applyClientFilters, screensToCsv } from '@/lib/screens'

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

const { data, isLoading } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'screens', 'map', JSON.stringify(filters.value))),
  queryFn: () => getScreensMap(filters.value),
})

const allScreens = computed<Screen[]>(() => data.value ?? [])
const lgaOptions = computed(() => [...new Set(allScreens.value.map((s) => s.lga))].sort())
const venueOptions = computed(() => [...new Set(allScreens.value.map((s) => s.venueType))].sort())

const filtered = computed(() => {
  let list = applyClientFilters(allScreens.value, {
    minReach: minReach.value ?? undefined,
    maxPriceKobo: maxPriceNaira.value != null ? maxPriceNaira.value * 100 : undefined,
  })
  if (onlineOnly.value) list = list.filter((s) => isOnline(s.status))
  return list
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

const cardScreen = computed(() => filtered.value.find((s) => s.id === selectedId.value) ?? null)
const drawerScreen = computed(() => filtered.value.find((s) => s.id === drawerId.value) ?? null)

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
  basket.addMany(filtered.value.filter((s) => s.lga === lga.value))
}
function exportCsv() {
  const blob = new Blob([screensToCsv(filtered.value)], { type: 'text/csv;charset=utf-8' })
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
  <div class="relative -mx-6 -my-5 h-[calc(100vh-2.75rem)] overflow-hidden bg-neutral-100">
    <!-- Map -->
    <ScreensMap
      v-show="view === 'map'"
      class="absolute inset-0"
      :screens="filtered"
      :selected-ids="basket.ids"
      @select="(s) => (selectedId = s.id)"
    />

    <!-- List (overlays the map when toggled) -->
    <div v-show="view === 'list'" class="absolute inset-0 overflow-auto bg-[var(--bg)] p-6 pt-20">
      <table class="w-full text-sm">
        <thead class="sticky top-0 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-400">
          <tr>
            <th class="px-4 py-2">{{ $t('screens.venue') }}</th>
            <th class="px-4 py-2">{{ $t('nav.screens') }}</th>
            <th class="px-4 py-2">{{ $t('screens.estReach') }}</th>
            <th class="px-4 py-2">{{ $t('screens.basePrice') }}</th>
            <th class="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in filtered" :key="s.id" class="border-t border-neutral-100 hover:bg-neutral-50">
            <td class="px-4 py-2">
              <button class="font-medium text-neutral-900 hover:text-clay-600" @click="drawerId = s.id">{{ s.name }}</button>
              <span class="ml-2 inline-block h-2 w-2 rounded-full" :class="isOnline(s.status) ? 'bg-moss-500' : 'bg-neutral-400'" />
            </td>
            <td class="px-4 py-2 text-neutral-500">{{ s.lga }} · {{ s.venueType }}</td>
            <td class="px-4 py-2 font-mono">{{ s.estimatedDailyReach ?? '—' }}</td>
            <td class="px-4 py-2 font-mono">{{ s.basePriceKobo ? formatKobo(s.basePriceKobo) : '—' }}</td>
            <td class="px-4 py-2 text-right">
              <button
                v-if="session.canMutate"
                class="text-sm"
                :class="basket.has(s.id) ? 'text-clay-600' : 'text-neutral-500 hover:text-clay-600'"
                @click="basket.toggle(s)"
              >
                {{ basket.has(s.id) ? $t('screens.added') : $t('screens.add') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- TOP-LEFT: Filters panel -->
    <div class="absolute left-4 top-4 z-[2] w-[280px] max-w-[calc(100%-2rem)]">
      <div class="overflow-hidden rounded-xl border border-line bg-white/95 shadow-pop backdrop-blur">
        <button
          class="flex w-full items-center gap-2 px-3.5 py-2.5 text-left"
          @click="filtersOpen = !filtersOpen"
        >
          <PhFunnel :size="16" class="text-clay-600" />
          <span class="text-[13px] font-semibold text-neutral-900">{{ $t('screens.filters') }}</span>
          <span v-if="activeFilterCount" class="rounded bg-clay-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-clay-600">
            {{ activeFilterCount }}
          </span>
          <span class="ml-auto text-[11px] text-neutral-400" data-testid="result-count">
            {{ isLoading ? $t('common.loading') : $t('screens.resultCount', { count: filtered.length }) }}
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
      <div class="flex overflow-hidden rounded-lg border border-line bg-white shadow-card">
        <button class="flex items-center gap-1 px-3 py-1.5 text-sm" :class="view === 'map' ? 'bg-clay-50 text-clay-700' : 'text-neutral-600'" @click="view = 'map'">
          <PhMapTrifold :size="16" /> {{ $t('screens.mapView') }}
        </button>
        <button class="flex items-center gap-1 px-3 py-1.5 text-sm" :class="view === 'list' ? 'bg-clay-50 text-clay-700' : 'text-neutral-600'" @click="view = 'list'">
          <PhListBullets :size="16" /> {{ $t('screens.listView') }}
        </button>
      </div>
      <Button variant="secondary" size="sm" class="shadow-card" @click="exportCsv">
        <PhDownloadSimple :size="16" /> {{ $t('screens.exportCsv') }}
      </Button>
    </div>

    <!-- BOTTOM-LEFT: selected screen quick card (mobile-style) -->
    <div v-if="cardScreen" class="absolute bottom-4 left-4 z-[2] w-[340px] max-w-[calc(100%-2rem)]">
      <div class="rounded-xl border border-line bg-white p-4 shadow-pop">
        <div class="flex items-start gap-3">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-clay-50 text-clay-600">
            <PhMapTrifold :size="22" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="truncate font-display text-[15px] font-semibold text-neutral-900">{{ cardScreen.name }}</p>
              <span class="inline-block h-2 w-2 shrink-0 rounded-full" :class="isOnline(cardScreen.status) ? 'bg-moss-500' : 'bg-neutral-400'" />
            </div>
            <p class="truncate text-xs capitalize text-neutral-500">{{ cardScreen.lga }} · {{ cardScreen.venueType }}</p>
            <p v-if="cardScreen.basePriceKobo" class="mt-1 font-mono text-sm font-semibold text-clay-700">
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
      <div class="overflow-hidden rounded-xl border border-line bg-white shadow-pop">
        <button class="flex w-full items-center gap-2 px-3.5 py-2.5 text-left" @click="basketOpen = !basketOpen">
          <span class="text-[13px] font-semibold text-neutral-900">{{ $t('screens.basket') }}</span>
          <span class="rounded bg-clay-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-clay-600" data-testid="basket-count">
            {{ basket.count }}
          </span>
          <PhCaretDown :size="14" class="ml-auto shrink-0 text-neutral-400 transition-transform" :class="basketOpen ? '' : '-rotate-90'" />
        </button>

        <div v-if="basketOpen" class="space-y-3 border-t border-line p-3.5">
          <div class="rounded-lg bg-neutral-50 p-3">
            <p class="text-xs text-neutral-500">{{ $t('screens.estReach') }}</p>
            <p class="font-mono text-xl text-neutral-900">{{ basket.reach }}</p>
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
          <div v-if="basket.savedSets.length" class="border-t border-neutral-100 pt-2">
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
