<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import Button from '@/components/ui/Button.vue'
import { useSession } from '@/stores/session'
import { getWallet } from '@/api/billing'
import { listCampaigns } from '@/api/campaigns'
import { ctxKey } from '@/lib/ctx-key'
import { formatKobo } from '@/lib/money'

/** Dashboard (§4.8) — assembled from existing endpoints; no bespoke analytics. */
const session = useSession()

const { data: wallet } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'wallet')),
  queryFn: getWallet,
})
const { data: campaigns } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'campaigns', 'all')),
  queryFn: () => listCampaigns({}),
})

const list = computed(() => campaigns.value?.campaigns ?? [])
const byStatus = computed(() => {
  const m: Record<string, number> = {}
  for (const c of list.value) m[c.status] = (m[c.status] ?? 0) + 1
  return m
})
const activeCount = computed(() => byStatus.value['active'] ?? 0)
const lowBalance = computed(() => (wallet.value ? Number(wallet.value.balanceKobo) < 500_000_00 : false))
const inReview = computed(() => list.value.filter((c) => c.status === 'pending_vetting').length)
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="font-display text-3xl font-semibold text-neutral-900">{{ $t('nav.dashboard') }}</h1>
      <RouterLink v-if="session.canSubmitCampaign" to="/campaigns/new">
        <Button size="sm">{{ $t('dashboard.quickStart') }}</Button>
      </RouterLink>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-xl border border-neutral-200 bg-white p-5">
        <p class="text-xs uppercase tracking-wide text-neutral-400">{{ $t('dashboard.walletBalance') }}</p>
        <p class="mt-1 font-mono text-2xl font-semibold text-neutral-900">{{ wallet ? formatKobo(wallet.balanceKobo) : '—' }}</p>
        <RouterLink v-if="lowBalance" to="/billing" class="text-xs text-clay-600 hover:underline">{{ $t('dashboard.lowBalance') }}</RouterLink>
      </div>
      <div class="rounded-xl border border-neutral-200 bg-white p-5">
        <p class="text-xs uppercase tracking-wide text-neutral-400">{{ $t('dashboard.activeCampaigns') }}</p>
        <p class="mt-1 font-mono text-2xl font-semibold text-neutral-900">{{ activeCount }}</p>
      </div>
      <div class="rounded-xl border border-neutral-200 bg-white p-5">
        <p class="text-xs uppercase tracking-wide text-neutral-400">Role</p>
        <p class="mt-1 text-sm capitalize text-neutral-900">{{ session.role ?? '—' }}</p>
      </div>
      <div class="rounded-xl border border-neutral-200 bg-white p-5">
        <p class="text-xs uppercase tracking-wide text-neutral-400">Tier</p>
        <p class="mt-1 text-sm capitalize text-neutral-900">{{ session.context.tier ?? '—' }}</p>
      </div>
    </div>

    <div class="mt-6 grid gap-4 lg:grid-cols-2">
      <div class="rounded-xl border border-neutral-200 bg-white p-5">
        <p class="mb-3 text-sm font-medium text-neutral-700">{{ $t('dashboard.byStatus') }}</p>
        <div v-if="Object.keys(byStatus).length" class="space-y-1">
          <div v-for="(n, st) in byStatus" :key="st" class="flex justify-between text-sm">
            <span class="capitalize text-neutral-600">{{ String(st).replace(/_/g, ' ') }}</span>
            <span class="font-mono">{{ n }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-neutral-400">{{ $t('campaigns.empty') }}</p>
      </div>
      <div class="rounded-xl border border-neutral-200 bg-white p-5">
        <p class="mb-3 text-sm font-medium text-neutral-700">{{ $t('dashboard.pending') }}</p>
        <ul class="space-y-1 text-sm">
          <li v-if="lowBalance" class="text-clay-700">{{ $t('dashboard.lowBalance') }}</li>
          <li v-if="inReview" class="text-neutral-600">{{ $t('dashboard.creativesInReview', { n: inReview }) }}</li>
          <li v-if="!lowBalance && !inReview" class="text-neutral-400">{{ $t('dashboard.allClear') }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>
