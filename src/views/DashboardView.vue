<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import {
  PhWallet,
  PhMegaphone,
  PhClockCountdown,
  PhStack,
  PhArrowRight,
  PhWarningCircle,
  PhCheckCircle,
  PhSealCheck,
} from '@phosphor-icons/vue'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import StatCard from '@/components/ui/StatCard.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import Badge from '@/components/ui/Badge.vue'
import { useSession } from '@/stores/session'
import { useKyc } from '@/composables/useKyc'
import { getWallet } from '@/api/billing'
import { listCampaigns } from '@/api/campaigns'
import { ctxKey } from '@/lib/ctx-key'
import { formatKobo } from '@/lib/money'
import { statusTone, statusLabel } from '@/lib/status'

/** Dashboard (§4.8) — assembled from existing endpoints; no bespoke analytics. */
const session = useSession()
const { kycComplete } = useKyc()

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
const statusRows = computed(() =>
  Object.entries(byStatus.value).sort((a, b) => b[1] - a[1]),
)
const activeCount = computed(() => byStatus.value['active'] ?? 0)
const lowBalance = computed(() => (wallet.value ? Number(wallet.value.balanceKobo) < 500_000_00 : false))
const inReview = computed(() => list.value.filter((c) => c.status === 'pending_vetting').length)

const dashSubtitle = computed(() => {
  const role = session.role ? session.role.replace(/_/g, ' ') : null
  const tier = session.context.tier ?? null
  return [role, tier].filter(Boolean).join(' · ') || undefined
})
</script>

<template>
  <div>
    <PageHeader :title="$t('nav.dashboard')" :subtitle="dashSubtitle">
      <template #actions>
        <template v-if="session.canSubmitCampaign">
          <RouterLink v-if="kycComplete" to="/campaigns/new">
            <Button>
              <PhMegaphone :size="18" />
              {{ $t('dashboard.quickStart') }}
            </Button>
          </RouterLink>
          <RouterLink v-else to="/verify">
            <Button variant="outline">
              <PhSealCheck :size="18" />
              {{ $t('verification.gateCta') }}
            </Button>
          </RouterLink>
        </template>
      </template>
    </PageHeader>

    <!-- KPI tiles -->
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard :label="$t('dashboard.walletBalance')" :value="wallet ? formatKobo(wallet.balanceKobo) : '—'">
        <template #icon><PhWallet :size="20" /></template>
        <template v-if="lowBalance" #footer>
          <RouterLink to="/billing" class="inline-flex items-center gap-1 font-medium text-clay-600 hover:underline">
            {{ $t('dashboard.lowBalance') }} <PhArrowRight :size="12" />
          </RouterLink>
        </template>
      </StatCard>

      <StatCard :label="$t('dashboard.activeCampaigns')" :value="activeCount">
        <template #icon><PhMegaphone :size="20" /></template>
      </StatCard>

      <StatCard label="In review" :value="inReview">
        <template #icon><PhClockCountdown :size="20" /></template>
      </StatCard>

      <StatCard label="Total campaigns" :value="list.length">
        <template #icon><PhStack :size="20" /></template>
      </StatCard>
    </div>

    <!-- Detail row -->
    <div class="mt-6 grid gap-5 lg:grid-cols-5">
      <Card class="lg:col-span-3">
        <p class="mb-4 text-sm font-semibold text-neutral-900">{{ $t('dashboard.byStatus') }}</p>
        <ul v-if="statusRows.length" class="divide-y divide-neutral-100">
          <li v-for="[st, n] in statusRows" :key="st" class="flex items-center justify-between py-2.5">
            <Badge :tone="statusTone(st)">{{ statusLabel(st) }}</Badge>
            <span class="font-mono text-sm font-semibold text-neutral-700">{{ n }}</span>
          </li>
        </ul>
        <p v-else class="py-6 text-center text-sm text-neutral-400">{{ $t('campaigns.empty') }}</p>
      </Card>

      <Card class="lg:col-span-2">
        <p class="mb-4 text-sm font-semibold text-neutral-900">{{ $t('dashboard.pending') }}</p>
        <ul class="space-y-3 text-sm">
          <li v-if="lowBalance" class="flex items-start gap-2.5 text-neutral-700">
            <PhWarningCircle :size="18" class="mt-0.5 shrink-0 text-gold-500" weight="fill" />
            <span>{{ $t('dashboard.lowBalance') }}</span>
          </li>
          <li v-if="inReview" class="flex items-start gap-2.5 text-neutral-700">
            <PhClockCountdown :size="18" class="mt-0.5 shrink-0 text-clay-500" />
            <span>{{ $t('dashboard.creativesInReview', { n: inReview }) }}</span>
          </li>
          <li v-if="!lowBalance && !inReview" class="flex items-start gap-2.5 text-neutral-500">
            <PhCheckCircle :size="18" class="mt-0.5 shrink-0 text-moss-500" weight="fill" />
            <span>{{ $t('dashboard.allClear') }}</span>
          </li>
        </ul>
      </Card>
    </div>
  </div>
</template>
