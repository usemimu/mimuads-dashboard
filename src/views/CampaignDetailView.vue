<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import Button from '@/components/ui/Button.vue'
import { useSession } from '@/stores/session'
import {
  getCampaign, getPerformance, getPerformanceBreakdown, getDecisionFactors,
  pauseCampaign, resumeCampaign, topUpCampaign, extendCampaign, cloneCampaign,
} from '@/api/campaigns'
import { ctxKey } from '@/lib/ctx-key'
import { formatKobo, nairaToKobo } from '@/lib/money'
import { isApiError } from '@/api/errors'

const route = useRoute()
const router = useRouter()
const session = useSession()
const qc = useQueryClient()
const id = computed(() => String(route.params.id))
const error = ref<string | null>(null)

const { data: c } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'campaign', id.value)),
  queryFn: () => getCampaign(id.value),
})

const pacing = computed(() => {
  if (!c.value) return 0
  const b = Number(c.value.budgetKobo), sp = Number(c.value.spentKobo)
  return b > 0 ? Math.min(100, Math.round((sp / b) * 100)) : 0
})

const tab = ref<'overall' | 'by-screen' | 'by-hour' | 'by-day'>('overall')
const { data: perf } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'perf', id.value, tab.value)),
  queryFn: () => (tab.value === 'overall' ? getPerformance(id.value) : getPerformanceBreakdown(id.value, tab.value)),
})
const { data: factors } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'factors', id.value)),
  queryFn: () => getDecisionFactors(id.value),
})
const factorList = computed(() => {
  const f = factors.value as { factors?: Array<{ label?: string; name?: string; weight?: number; value?: number }> } | undefined
  return f?.factors ?? []
})

async function run(fn: () => Promise<unknown>) {
  error.value = null
  try {
    await fn()
    qc.invalidateQueries({ queryKey: ctxKey(session.context, 'campaign', id.value) })
  } catch (e) {
    error.value = isApiError(e) ? e.message : 'Action failed'
  }
}
function onTopup() {
  const naira = Number(window.prompt('Top-up amount (₦)?') ?? '')
  if (naira > 0) run(() => topUpCampaign(id.value, String(nairaToKobo(naira)), 'topup-' + Date.now()))
}
function onExtend() {
  const d = window.prompt('New end date (YYYY-MM-DD)?')
  if (d) run(() => extendCampaign(id.value, new Date(`${d}T00:00:00Z`).toISOString()))
}
async function onClone() {
  error.value = null
  try {
    const clone = await cloneCampaign(id.value)
    router.push(`/campaigns/${clone.id}`)
  } catch (e) {
    error.value = isApiError(e) ? e.message : 'Clone failed'
  }
}
</script>

<template>
  <div v-if="c" class="max-w-4xl">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="font-display text-3xl font-semibold text-neutral-900">{{ c.name }}</h1>
        <span class="text-sm capitalize text-neutral-500">{{ c.status.replace(/_/g, ' ') }} · {{ c.objective }}</span>
      </div>
      <div v-if="session.canMutate" class="flex gap-2">
        <Button v-if="c.status === 'active'" size="sm" variant="secondary" @click="run(() => pauseCampaign(id))">{{ $t('campaigns.pause') }}</Button>
        <Button v-if="c.status === 'paused'" size="sm" variant="secondary" @click="run(() => resumeCampaign(id))">{{ $t('campaigns.resume') }}</Button>
        <Button size="sm" variant="secondary" @click="onTopup">{{ $t('campaigns.topup') }}</Button>
        <Button size="sm" variant="secondary" @click="onExtend">{{ $t('campaigns.extend') }}</Button>
        <Button size="sm" variant="outline" @click="onClone">{{ $t('campaigns.clone') }}</Button>
      </div>
    </div>
    <p v-if="error" role="alert" class="mb-3 text-sm text-clay-700">{{ error }}</p>

    <!-- Pacing -->
    <div class="mb-6 rounded-xl border border-neutral-200 bg-white p-5">
      <div class="mb-2 flex justify-between text-sm">
        <span class="text-neutral-500">{{ $t('campaigns.pacing') }}</span>
        <span class="font-mono">{{ formatKobo(c.spentKobo) }} / {{ formatKobo(c.budgetKobo) }}</span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-neutral-100">
        <div class="h-full bg-clay-500" :style="{ width: pacing + '%' }" />
      </div>
    </div>

    <!-- Performance tabs -->
    <div class="mb-6 rounded-xl border border-neutral-200 bg-white">
      <div class="flex gap-1 border-b border-neutral-200 p-2">
        <button v-for="t in (['overall','by-screen','by-hour','by-day'] as const)" :key="t"
          class="rounded px-3 py-1 text-sm" :class="tab === t ? 'bg-clay-50 text-clay-700' : 'text-neutral-600'"
          @click="tab = t">{{ $t('campaigns.tab' + t.replace(/(^|-)(\w)/g, (_, __, ch) => ch.toUpperCase())) }}</button>
      </div>
      <div class="p-5 text-sm text-neutral-600">
        <pre class="overflow-auto font-mono text-xs text-neutral-500">{{ perf ?? $t('common.loading') }}</pre>
      </div>
    </div>

    <!-- Decision factors -->
    <div class="rounded-xl border border-neutral-200 bg-white p-5">
      <h2 class="mb-3 font-display text-lg font-semibold text-neutral-900">{{ $t('campaigns.decisionFactors') }}</h2>
      <div v-if="factorList.length" class="space-y-2">
        <div v-for="(f, i) in factorList" :key="i">
          <div class="flex justify-between text-xs text-neutral-500">
            <span>{{ f.label ?? f.name }}</span><span>{{ Math.round((f.weight ?? f.value ?? 0) * 100) }}%</span>
          </div>
          <div class="h-1.5 rounded-full bg-neutral-100"><div class="h-full rounded-full bg-moss-400" :style="{ width: Math.round((f.weight ?? f.value ?? 0) * 100) + '%' }" /></div>
        </div>
      </div>
      <p v-else class="text-sm text-neutral-400">{{ $t('common.comingSoon') }}</p>
    </div>
  </div>
</template>
