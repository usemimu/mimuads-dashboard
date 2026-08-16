<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { RouterLink } from 'vue-router'
import { PhSealWarning } from '@phosphor-icons/vue'
import { useSession } from '@/stores/session'
import { getKycStatus } from '@/api/onboarding'
import { ctxKey } from '@/lib/ctx-key'

/**
 * Contextual verification banner (PRD §4.1 Page 4). Shown when the active org
 * isn't verified — advertiser orgs get a link to the verification hub; agency
 * orgs see the ops-driven enhanced-verification pending state.
 */
const session = useSession()
const isAgency = computed(() => session.context.tier === 'agency')

const { data } = useQuery({
  queryKey: ctxKey(session.context, 'kyc', 'status'),
  queryFn: getKycStatus,
  staleTime: 60_000,
})

const verified = computed(() => data.value?.isVerified === true)
const show = computed(() => session.hasOrg && !verified.value)
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
