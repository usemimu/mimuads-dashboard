<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthCard from '@/components/AuthCard.vue'
import Button from '@/components/ui/Button.vue'
import { resetPassword } from '@/api/onboarding'
import { isApiError } from '@/api/errors'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const toast = useToastStore()
const token = ref('')
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
        <input v-model="newPassword" type="password" minlength="8" required autocomplete="new-password" class="input" />
      </label>
      <p v-if="done" class="text-sm text-moss-600">{{ $t('reset.done') }}</p>
      <Button type="submit" size="lg" class="w-full" :disabled="submitting || token.length !== 6">{{ $t('reset.submit') }}</Button>
    </form>
    <template #footer>
      <RouterLink to="/login" class="font-medium text-clay-600 hover:underline">{{ $t('reset.backToLogin') }}</RouterLink>
    </template>
  </AuthCard>
</template>
