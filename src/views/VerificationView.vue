<script setup lang="ts">
import { ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import Button from '@/components/ui/Button.vue'
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
  <div class="max-w-xl">
    <h1 class="font-display text-3xl font-semibold text-neutral-900">{{ $t('verification.hubTitle') }}</h1>

    <div class="mt-6 rounded-xl border border-neutral-200 bg-white p-6">
      <p class="text-xs uppercase tracking-wide text-neutral-400">{{ $t('verification.currentLevel') }}</p>
      <p class="mt-1 text-lg font-medium capitalize text-neutral-900">
        {{ isLoading ? $t('verification.checking') : (status?.level || $t('verification.none')) }}
      </p>

      <div class="mt-5">
        <p v-if="isAgency" class="rounded-lg bg-gold-50 px-4 py-3 text-sm text-gold-800">
          {{ $t('verification.bannerAgency') }}
        </p>
        <div v-else class="flex gap-3">
          <Button :disabled="starting || status?.isVerified === true" @click="onStart">
            {{ starting ? $t('verification.starting') : $t('verification.start') }}
          </Button>
          <Button variant="outline" @click="() => refetch()">{{ $t('common.retry') }}</Button>
        </div>
      </div>
    </div>
  </div>
</template>
