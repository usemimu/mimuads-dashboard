<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthCard from '@/components/AuthCard.vue'
import Button from '@/components/ui/Button.vue'
import { forgotPassword } from '@/api/onboarding'
import { isApiError } from '@/api/errors'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const toast = useToastStore()
const phoneOrEmail = ref('')
const submitting = ref(false)
const sent = ref(false)

async function onSubmit() {
  submitting.value = true
  try {
    await forgotPassword(phoneOrEmail.value)
    sent.value = true
    setTimeout(() => router.push({ name: 'reset-password' }), 1200)
  } catch (e) {
    toast.error(isApiError(e) ? e.message : 'Could not send reset code.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthCard>
    <form class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <h2 class="font-display text-2xl font-semibold text-neutral-900">{{ $t('reset.forgotTitle') }}</h2>
        <p class="text-sm text-neutral-500">{{ $t('reset.forgotBody') }}</p>
      </div>
      <label class="block">
        <span class="label">{{ $t('auth.phoneOrEmail') }}</span>
        <input v-model="phoneOrEmail" required class="input" />
      </label>
      <p v-if="sent" class="text-sm text-moss-600">{{ $t('reset.sent') }}</p>
      <Button type="submit" size="lg" class="w-full" :disabled="submitting">{{ $t('reset.sendCode') }}</Button>
    </form>
    <template #footer>
      <RouterLink to="/login" class="font-medium text-clay-600 hover:underline">{{ $t('reset.backToLogin') }}</RouterLink>
    </template>
  </AuthCard>
</template>
