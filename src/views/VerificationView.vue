<script setup lang="ts">
import { computed, ref } from 'vue'
import { PhSealCheck, PhIdentificationCard, PhBuildings } from '@phosphor-icons/vue'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import Badge from '@/components/ui/Badge.vue'
import { useSession } from '@/stores/session'
import { startKyc } from '@/api/onboarding'
import { useKyc } from '@/composables/useKyc'

/**
 * Verification hub. Two independent milestones:
 *   1. Identity verification (`kycComplete`) — the operator's Dojah check.
 *      This is what unlocks campaign creation.
 *   2. Business approval (`businessApprovalStatus`) — ops sign-off, flips
 *      later and does NOT block campaign creation.
 * Agency orgs get the enhanced-verification pending note (ops-driven).
 */
const session = useSession()
const isAgency = session.context.tier === 'agency'

const { isLoading, refetch, kycComplete, businessApprovalStatus } = useKyc()

// pending → gold, approved → moss, rejected/other → clay.
const approvalTone = computed(() => {
  const s = (businessApprovalStatus.value ?? '').toLowerCase()
  if (s === 'approved' || s === 'verified') return 'success'
  if (s === 'rejected' || s === 'suspended') return 'danger'
  return 'pending'
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
  <div>
    <PageHeader :title="$t('verification.hubTitle')" />

    <div class="max-w-2xl">
    <Card>
      <!-- Identity verification -->
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-clay-50 text-clay-600">
            <PhIdentificationCard :size="20" />
          </div>
          <div>
            <p class="font-display text-lg font-semibold text-neutral-900">{{ $t('verification.identity') }}</p>
            <p class="text-sm text-neutral-500">{{ $t('verification.identityHint') }}</p>
          </div>
        </div>
        <Badge :tone="kycComplete ? 'success' : 'pending'" :dot="true">
          {{ isLoading ? $t('verification.checking') : kycComplete ? $t('verification.verified') : $t('verification.none') }}
        </Badge>
      </div>

      <div v-if="!kycComplete" class="mt-5 border-t border-neutral-100 pt-5">
        <p v-if="isAgency" class="rounded-xl bg-gold-50 px-4 py-3 text-sm text-gold-800">
          {{ $t('verification.bannerAgency') }}
        </p>
        <div v-else class="flex gap-3">
          <Button :disabled="starting" @click="onStart">
            <PhSealCheck :size="18" />
            {{ starting ? $t('verification.starting') : $t('verification.start') }}
          </Button>
          <Button variant="outline" @click="() => refetch()">{{ $t('common.retry') }}</Button>
        </div>
      </div>
      <p v-else class="mt-4 text-sm text-moss-600">{{ $t('verification.identityDone') }}</p>
    </Card>

    <!-- Business approval — separate, non-blocking -->
    <Card class="mt-6">
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-moss-50 text-moss-600">
            <PhBuildings :size="20" />
          </div>
          <div>
            <p class="font-display text-lg font-semibold text-neutral-900">{{ $t('verification.business') }}</p>
            <p class="text-sm text-neutral-500">{{ $t('verification.businessHint') }}</p>
          </div>
        </div>
        <Badge :tone="approvalTone" :dot="true" class="capitalize">
          {{ businessApprovalStatus || $t('verification.none') }}
        </Badge>
      </div>
    </Card>
    </div>
  </div>
</template>
