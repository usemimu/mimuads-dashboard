<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthCard from '@/components/AuthCard.vue'
import Button from '@/components/ui/Button.vue'
import PasswordField from '@/components/ui/PasswordField.vue'
import { resetPassword } from '@/api/onboarding'
import { isApiError } from '@/api/errors'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
// The password-reset email links here as /reset-password?token=123456.
// Prefill the code from the query so recipients who followed the link
// (on desktop, or on a phone without the app) only type a new password.
// Mobile users with the app installed never reach this page — the OS
// intercepts the same URL as a Universal/App Link and opens the app.
const tokenFromQuery = route.query.token
const token = ref(typeof tokenFromQuery === 'string' ? tokenFromQuery : '')
const newPassword = ref('')
const submitting = ref(false)
const done = ref(false)

async function onSubmit() {
  submitting.value = true
  try {
    await resetPassword(token.value, newPassword.value)
    done.value = true
    setTimeout(() => router.push({ name: 'login' }), 1200)
  } catch (e) {
    toast.error(isApiError(e) ? e.message : 'Could not reset password.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthCard>
    <form class="space-y-4" @submit.prevent="onSubmit">
      <h2 class="font-display text-2xl font-semibold text-neutral-900">{{ $t('reset.resetTitle') }}</h2>
      <label class="block">
        <span class="label">{{ $t('reset.code') }}</span>
        <input v-model="token" inputmode="numeric" maxlength="6" required class="input text-center font-mono tracking-widest" />
      </label>
      <label class="block">
        <span class="label">{{ $t('reset.newPassword') }}</span>
        <PasswordField v-model="newPassword" :minlength="8" required autocomplete="new-password" :aria-label="$t('reset.newPassword')" />
      </label>
      <p v-if="done" class="text-sm text-moss-600">{{ $t('reset.done') }}</p>
      <Button type="submit" size="lg" class="w-full" :disabled="submitting || token.length !== 6">{{ $t('reset.submit') }}</Button>
    </form>
    <template #footer>
      <RouterLink to="/login" class="font-medium text-clay-600 hover:underline">{{ $t('reset.backToLogin') }}</RouterLink>
    </template>
  </AuthCard>
</template>
