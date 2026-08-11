<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthCard from '@/components/AuthCard.vue'
import Button from '@/components/ui/Button.vue'
import { forgotPassword } from '@/api/onboarding'
import { isApiError } from '@/api/errors'

const router = useRouter()
const phoneOrEmail = ref('')
const submitting = ref(false)
const sent = ref(false)
const error = ref<string | null>(null)

async function onSubmit() {
  error.value = null
  submitting.value = true
  try {
    await forgotPassword(phoneOrEmail.value)
    sent.value = true
    setTimeout(() => router.push({ name: 'reset-password' }), 1200)
  } catch (e) {
    error.value = isApiError(e) ? e.message : null
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
        <span class="mb-1 block text-sm font-medium text-neutral-700">{{ $t('auth.phoneOrEmail') }}</span>
        <input v-model="phoneOrEmail" required class="w-full rounded-lg border-neutral-300 focus:border-clay-400 focus:ring-clay-400" />
      </label>
      <p v-if="sent" class="text-sm text-moss-600">{{ $t('reset.sent') }}</p>
      <p v-if="error" role="alert" class="text-sm text-clay-700">{{ error }}</p>
      <Button type="submit" size="lg" class="w-full" :disabled="submitting">{{ $t('reset.sendCode') }}</Button>
    </form>
    <template #footer>
      <RouterLink to="/login" class="font-medium text-clay-600 hover:underline">{{ $t('reset.backToLogin') }}</RouterLink>
    </template>
  </AuthCard>
</template>
