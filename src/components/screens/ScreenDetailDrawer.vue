<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { PhX } from '@phosphor-icons/vue'
import Button from '@/components/ui/Button.vue'
import { getScreen } from '@/api/screens'
import { isOnline } from '@/api/contracts/screens'
import { useSession } from '@/stores/session'
import { useBasket } from '@/stores/basket'
import { ctxKey } from '@/lib/ctx-key'
import { formatKobo } from '@/lib/money'
import type { Screen } from '@/api/contracts/screens'

/**
 * Screen detail drawer. Draws an hourly footfall curve from `peakHours` (the
 * backend doesn't return hourlyTraffic yet — flagged), and lets the user add/
 * remove the screen from the basket.
 */
const props = defineProps<{ screenId: string; summary: Screen | null }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const session = useSession()
const basket = useBasket()

const { data: detail } = useQuery({
  queryKey: ctxKey(session.context, 'screen', props.screenId),
  queryFn: () => getScreen(props.screenId),
})

const screen = computed(() => detail.value ?? props.summary)
const online = computed(() => (screen.value ? isOnline(screen.value.status) : false))

// 24-hour footfall bars derived from peakHours (peaks tall, others short).
const bars = computed(() => {
  const peaks = new Set(detail.value?.peakHours ?? props.summary?.peakHours ?? [])
  return Array.from({ length: 24 }, (_, h) => ({ h, v: peaks.has(h) ? 1 : 0.28 }))
})

function toggle() {
  const s = screen.value
  if (s) basket.toggle(s as Screen)
}
</script>

<template>
  <aside class="flex h-full w-96 flex-col border-l border-neutral-200 bg-white shadow-card">
    <header class="flex items-start justify-between border-b border-neutral-100 p-5">
      <div>
        <h2 class="font-display text-xl font-semibold text-neutral-900">{{ screen?.name }}</h2>
        <span
          class="mt-1 inline-flex items-center gap-1 text-xs font-medium"
          :class="online ? 'text-moss-600' : 'text-neutral-500'"
        >
          <span class="h-2 w-2 rounded-full" :class="online ? 'bg-moss-500' : 'bg-neutral-400'" />
          {{ online ? $t('screens.online') : $t('screens.offline') }}
        </span>
      </div>
      <button class="text-neutral-400 hover:text-neutral-700" :aria-label="$t('common.close')" @click="emit('close')">
        <PhX :size="20" />
      </button>
    </header>

    <div class="flex-1 space-y-5 overflow-auto p-5">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{{ $t('screens.venue') }}</p>
        <p class="text-sm text-neutral-900">{{ screen?.venueName }} · {{ screen?.venueType }}</p>
      </div>
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{{ $t('screens.address') }}</p>
        <p class="text-sm text-neutral-900">{{ screen?.address }}</p>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{{ $t('screens.estReach') }}</p>
          <p class="font-mono text-lg text-neutral-900">{{ screen?.estimatedDailyReach ?? '—' }}</p>
        </div>
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{{ $t('screens.basePrice') }}</p>
          <p class="font-mono text-lg text-neutral-900">
            {{ screen?.basePriceKobo ? formatKobo(screen.basePriceKobo) : '—' }}
          </p>
        </div>
      </div>

      <div>
        <p class="mb-2 text-xs uppercase tracking-wide text-neutral-400">{{ $t('screens.footfall') }}</p>
        <svg viewBox="0 0 240 60" class="h-16 w-full" preserveAspectRatio="none" role="img">
          <rect
            v-for="b in bars"
            :key="b.h"
            :x="b.h * 10"
            :y="60 - b.v * 56"
            width="8"
            :height="b.v * 56"
            :class="b.v > 0.5 ? 'fill-clay-400' : 'fill-neutral-200'"
          />
        </svg>
        <p class="mt-1 text-[11px] text-neutral-400">{{ $t('screens.peakHoursNote') }}</p>
      </div>
    </div>

    <footer class="border-t border-neutral-100 p-5">
      <Button
        v-if="session.canMutate"
        class="w-full"
        :variant="screen && basket.has(screen.id) ? 'outline' : 'primary'"
        @click="toggle"
      >
        {{ screen && basket.has(screen.id) ? $t('screens.remove') : $t('screens.add') }}
      </Button>
    </footer>
  </aside>
</template>
