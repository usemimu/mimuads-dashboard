<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { PhSealWarning } from '@phosphor-icons/vue'
import { useSession } from '@/stores/session'
import { useKyc } from '@/composables/useKyc'

/**
 * Contextual verification banner (PRD §4.1 Page 4). Shown while the operator
 * hasn't finished identity verification (`kycComplete`). Once complete the
 * banner clears — pending *business* approval is a separate, non-blocking
 * state and does not keep the banner up. Agency orgs see the ops-driven
 * enhanced-verification note.
 */
const session = useSession()
const isAgency = computed(() => session.context.tier === 'agency')

const { kycComplete } = useKyc()
const show = computed(() => session.hasOrg && !kycComplete.value)
</script>

<template>
  <div
    v-if="show"
    class="flex items-center justify-center gap-2 border-b border-gold-200/60 bg-gold-50 px-6 py-2.5 text-center text-sm text-gold-800"
  >
    <PhSealWarning :size="17" weight="fill" class="shrink-0 text-gold-500" />
    <template v-if="isAgency">{{ $t('verification.bannerAgency') }}</template>
    <template v-else>
      <span>{{ $t('verification.bannerAdvertiser') }}</span>
      <RouterLink to="/verify" class="font-semibold underline underline-offset-2 hover:text-gold-900">{{ $t('verification.start') }}</RouterLink>
    </template>
  </div>
</template>
