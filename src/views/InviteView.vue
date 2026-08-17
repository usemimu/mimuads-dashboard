<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthCard from '@/components/AuthCard.vue'
import Button from '@/components/ui/Button.vue'
import { useSession } from '@/stores/session'
import { useInvite } from '@/stores/invite'
import { acceptInvite } from '@/api/onboarding'
import { isApiError } from '@/api/errors'
import { useToastStore } from '@/stores/toast'
import { useI18n } from 'vue-i18n'

/**
 * Invite path (PRD §4.1). Records the token, then: if signed in, accept it and
 * land inside the inviting org (bypassing org creation); if not, route to sign-in
 * (the onboarding guard brings the user back here to accept after auth).
 * A public token-preview endpoint doesn't exist yet (backend fast-follow), so we
 * can't show the org name before acceptance.
 */
const route = useRoute()
const router = useRouter()
const session = useSession()
const invite = useInvite()
const toast = useToastStore()
const { t } = useI18n()

const token = String(route.params.token ?? '')
const failed = ref(false)
const accepting = ref(false)

async function accept() {
  accepting.value = true
  failed.value = false
  try {
    await acceptInvite(token)
    invite.clear()
    await session.refreshSession()
    router.replace('/dashboard')
  } catch (e) {
    failed.value = true
    toast.error(isApiError(e) ? e.message : t('invite.invalid'))
  } finally {
    accepting.value = false
  }
}

onMounted(() => {
  if (token) invite.set(token)
  if (!session.isAuthenticated) {
    router.replace({ name: 'login', query: { redirect: `/invite/${token}` } })
    return
  }
  void accept()
})
</script>

<template>
  <AuthCard>
    <div class="space-y-4 text-center">
      <h2 class="font-display text-2xl font-semibold text-neutral-900">{{ $t('invite.title') }}</h2>
      <p v-if="accepting" class="text-sm text-neutral-500">{{ $t('invite.accepting') }}</p>
      <p v-else-if="failed" role="alert" class="text-sm text-clay-700">{{ $t('invite.invalid') }}</p>
      <Button v-if="failed" variant="outline" class="w-full" @click="accept">{{ $t('common.retry') }}</Button>
    </div>
  </AuthCard>
</template>
