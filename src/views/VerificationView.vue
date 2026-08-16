<script setup lang="ts">
import { ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { PhSealCheck } from '@phosphor-icons/vue'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import Badge from '@/components/ui/Badge.vue'
import { useSession } from '@/stores/session'
import { getKycStatus, startKyc } from '@/api/onboarding'
import { ctxKey } from '@/lib/ctx-key'

/**
 * Verification hub (PRD §4.1 Page 4 / §4.7). Advertiser orgs launch the Dojah
 * hosted widget (opened in a new tab; full in-page embed is a follow-up); agency
 * orgs see the enhanced-verification pending state (ops-driven).
 */
const session = useSession()
const isAgency = session.context.tier === 'agency'

const { data: status, isLoading, refetch } = useQuery({
  queryKey: ctxKey(session.context, 'kyc', 'status'),
  queryFn: getKycStatus,
})

const starting = ref(false)
async function onStart() {
  starting.value = true
  try {
    const res = await startKyc()
    window.open(res.hostedUrl, '_blank', 'noopener')
  } finally {
    starting.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <PageHeader :title="$t('verification.hubTitle')" />

    <Card>
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            {{ $t('verification.currentLevel') }}
          </p>
          <p class="mt-1.5 text-lg font-semibold capitalize text-neutral-900">
            {{ isLoading ? $t('verification.checking') : (status?.level || $t('verification.none')) }}
          </p>
        </div>
        <Badge :tone="status?.isVerified ? 'success' : 'pending'" :dot="true">
          {{ status?.isVerified ? 'Verified' : $t('verification.none') }}
        </Badge>
      </div>

      <div class="mt-6 border-t border-neutral-100 pt-5">
        <p v-if="isAgency" class="rounded-xl bg-gold-50 px-4 py-3 text-sm text-gold-800">
          {{ $t('verification.bannerAgency') }}
        </p>
        <div v-else class="flex gap-3">
          <Button :disabled="starting || status?.isVerified === true" @click="onStart">
            <PhSealCheck :size="18" />
            {{ starting ? $t('verification.starting') : $t('verification.start') }}
          </Button>
          <Button variant="outline" @click="() => refetch()">{{ $t('common.retry') }}</Button>
        </div>
      </div>
    </Card>
  </div>
</template>
