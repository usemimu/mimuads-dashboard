<script setup lang="ts">
import MimuIcon from '@/components/ui/MimuIcon.vue'
import { computed, ref } from 'vue'
import { PhSealCheck } from '@phosphor-icons/vue'
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
    <PageHeader :title="$t('verification.hubTitle')" :subtitle="$t('verification.hubSubtitle')" />

    <div class="max-w-2xl">
      <Card padding="none" class="overflow-hidden divide-y divide-line">
        <!-- Identity verification -->
        <div class="p-5">
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-3">
              <MimuIcon name="secure" variant="sticker" :size="68" class="-my-2 shrink-0" />
              <div>
                <p class="font-body text-[15px] font-semibold text-neutral-900">{{ $t('verification.identity') }}</p>
                <p class="mt-0.5 text-sm text-neutral-500">{{ $t('verification.identityHint') }}</p>
              </div>
            </div>
            <Badge :tone="kycComplete ? 'success' : 'pending'" :dot="true" class="shrink-0">
              {{ isLoading ? $t('verification.checking') : kycComplete ? $t('verification.verified') : $t('verification.none') }}
            </Badge>
          </div>

          <div v-if="!kycComplete" class="mt-4 border-t border-line pt-4">
            <p v-if="isAgency" class="rounded-xl bg-gold-500/10 px-4 py-3 text-sm text-gold-800">
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
          <p v-else class="mt-3 text-sm text-moss-600">{{ $t('verification.identityDone') }}</p>
        </div>

        <!-- Business approval — non-blocking -->
        <div class="p-5">
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-3">
              <MimuIcon name="agency" variant="sticker" :size="68" class="-my-2 shrink-0" />
              <div>
                <p class="font-body text-[15px] font-semibold text-neutral-900">{{ $t('verification.business') }}</p>
                <p class="mt-0.5 text-sm text-neutral-500">{{ $t('verification.businessHint') }}</p>
              </div>
            </div>
            <Badge :tone="approvalTone" :dot="true" class="shrink-0 capitalize">
              {{ businessApprovalStatus || $t('verification.none') }}
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>
