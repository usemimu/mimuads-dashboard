<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { PhMapTrifold, PhListBullets, PhDownloadSimple } from '@phosphor-icons/vue'
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
const selectedId = ref<string | null>(null)

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

const selectedSummary = computed(() => filtered.value.find((s) => s.id === selectedId.value) ?? null)

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
  <div class="flex h-[calc(100vh-8rem)] gap-4">
    <!-- Filter rail -->
    <div class="w-60 shrink-0 space-y-4 overflow-auto">
      <h1 class="font-display text-2xl font-semibold text-neutral-900">{{ $t('screens.title') }}</h1>
      <input v-model="search" :placeholder="$t('screens.search')" class="w-full rounded-lg border-neutral-300 text-sm focus:border-clay-400 focus:ring-clay-400" />
      <select v-model="lga" :aria-label="$t('nav.screens')" class="w-full rounded-lg border-neutral-300 text-sm focus:border-clay-400 focus:ring-clay-400">
        <option value="">{{ $t('screens.allLgas') }}</option>
        <option v-for="l in lgaOptions" :key="l" :value="l">{{ l }}</option>
      </select>
      <select v-model="venueType" :aria-label="$t('screens.status')" class="w-full rounded-lg border-neutral-300 text-sm focus:border-clay-400 focus:ring-clay-400">
        <option value="">{{ $t('screens.allVenues') }}</option>
        <option v-for="v in venueOptions" :key="v" :value="v">{{ v }}</option>
      </select>
      <label class="flex items-center gap-2 text-sm text-neutral-700">
        <input v-model="onlineOnly" type="checkbox" class="rounded border-neutral-300 text-clay-500 focus:ring-clay-400" />
        {{ $t('screens.online') }}
      </label>
      <label class="block text-sm">
        <span class="mb-1 block text-neutral-600">{{ $t('screens.footfallBand') }}</span>
        <input v-model.number="minReach" type="number" min="0" class="w-full rounded-lg border-neutral-300 text-sm focus:border-clay-400 focus:ring-clay-400" />
      </label>
      <label class="block text-sm">
        <span class="mb-1 block text-neutral-600">{{ $t('screens.priceBand') }}</span>
        <input v-model.number="maxPriceNaira" type="number" min="0" class="w-full rounded-lg border-neutral-300 text-sm focus:border-clay-400 focus:ring-clay-400" />
      </label>
      <button class="text-sm text-clay-600 hover:underline" @click="clearFilters">{{ $t('screens.clearFilters') }}</button>
      <button v-if="lga && session.canMutate" class="block text-sm text-clay-600 hover:underline" @click="selectAllInLga">
        {{ $t('screens.selectLga') }}
      </button>
    </div>

    <!-- Map / list -->
    <div class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div class="flex items-center justify-between border-b border-neutral-200 px-4 py-2">
        <span class="text-sm text-neutral-500" data-testid="result-count">
          {{ isLoading ? $t('common.loading') : $t('screens.resultCount', { count: filtered.length }) }}
        </span>
        <div class="flex items-center gap-2">
          <div class="flex overflow-hidden rounded-lg border border-neutral-300">
            <button class="flex items-center gap-1 px-3 py-1 text-sm" :class="view === 'map' ? 'bg-clay-50 text-clay-700' : 'text-neutral-600'" @click="view = 'map'">
              <PhMapTrifold :size="16" /> {{ $t('screens.mapView') }}
            </button>
            <button class="flex items-center gap-1 px-3 py-1 text-sm" :class="view === 'list' ? 'bg-clay-50 text-clay-700' : 'text-neutral-600'" @click="view = 'list'">
              <PhListBullets :size="16" /> {{ $t('screens.listView') }}
            </button>
          </div>
          <Button variant="outline" size="sm" @click="exportCsv"><PhDownloadSimple :size="16" /> {{ $t('screens.exportCsv') }}</Button>
        </div>
      </div>

      <div class="relative min-h-0 flex-1">
        <ScreensMap v-show="view === 'map'" :screens="filtered" :selected-ids="basket.ids" @select="(s) => (selectedId = s.id)" />
        <div v-if="view === 'list'" class="h-full overflow-auto">
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
                  <button class="font-medium text-neutral-900 hover:text-clay-600" @click="selectedId = s.id">{{ s.name }}</button>
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
      </div>
    </div>

    <!-- Detail drawer -->
    <ScreenDetailDrawer v-if="selectedId" :screen-id="selectedId" :summary="selectedSummary" @close="selectedId = null" />

    <!-- Basket -->
    <div class="w-64 shrink-0 space-y-3 overflow-auto rounded-xl border border-neutral-200 bg-white p-4">
      <h2 class="font-display text-lg font-semibold text-neutral-900">{{ $t('screens.basket') }}</h2>
      <div class="rounded-lg bg-neutral-50 p-3">
        <p class="font-mono text-2xl text-neutral-900" data-testid="basket-count">{{ basket.count }}</p>
        <p class="text-xs text-neutral-500">{{ $t('screens.estReach') }}: <span class="font-mono">{{ basket.reach }}</span></p>
      </div>
      <p v-if="basket.count === 0" class="text-sm text-neutral-400">{{ $t('screens.basketEmpty') }}</p>
      <template v-else>
        <button class="text-sm text-clay-600 hover:underline" @click="basket.clear()">{{ $t('screens.clearSelection') }}</button>
        <div class="flex gap-2">
          <input v-model="setName" :placeholder="$t('screens.setName')" :aria-label="$t('screens.setName')" class="w-full rounded-lg border-neutral-300 text-sm focus:border-clay-400 focus:ring-clay-400" />
          <Button size="sm" variant="secondary" @click="saveSet">{{ $t('common.save') }}</Button>
        </div>
        <Button v-if="session.canSubmitCampaign" class="w-full" size="sm" @click="useInCampaign">{{ $t('screens.useInCampaign') }}</Button>
      </template>
      <div v-if="basket.savedSets.length" class="pt-2">
        <p class="mb-1 text-xs uppercase tracking-wide text-neutral-400">{{ $t('screens.savedSets') }}</p>
        <ul class="space-y-1">
          <li v-for="st in basket.savedSets" :key="st.name" class="flex items-center justify-between text-sm">
            <span class="text-neutral-700">{{ st.name }} ({{ st.screenIds.length }})</span>
            <button class="text-neutral-400 hover:text-clay-600" @click="basket.deleteSet(st.name)">×</button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
