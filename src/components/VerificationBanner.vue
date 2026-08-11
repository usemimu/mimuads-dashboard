<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { RouterLink } from 'vue-router'
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
  <div v-if="show" class="bg-gold-50 px-6 py-2 text-center text-sm text-gold-800">
    <template v-if="isAgency">{{ $t('verification.bannerAgency') }}</template>
    <template v-else>
      {{ $t('verification.bannerAdvertiser') }}
      <RouterLink to="/verify" class="ml-1 font-medium underline">{{ $t('verification.start') }}</RouterLink>
    </template>
  </div>
</template>
