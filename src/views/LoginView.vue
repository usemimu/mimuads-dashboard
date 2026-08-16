<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AuthCard from '@/components/AuthCard.vue'
import Button from '@/components/ui/Button.vue'
import { useSession } from '@/stores/session'
import { isApiError } from '@/api/errors'

const session = useSession()
const router = useRouter()
const route = useRoute()

const phoneOrEmail = ref('')
const password = ref('')
const submitting = ref(false)
const error = ref<string | null>(null)

async function onSubmit() {
  error.value = null
  submitting.value = true
  try {
    await session.loginWithPassword(phoneOrEmail.value, password.value)
    const redirect = (route.query.redirect as string) || '/dashboard'
    router.replace(redirect)
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
        <h2 class="font-display text-2xl font-semibold text-neutral-900">{{ $t('auth.signIn') }}</h2>
        <p class="text-sm text-neutral-500">{{ $t('app.tagline') }}</p>
      </div>

      <label class="block">
        <span class="label">{{ $t('auth.phoneOrEmail') }}</span>
        <input
          v-model="phoneOrEmail"
          type="text"
          autocomplete="username"
          required
          class="input"
        />
      </label>

      <label class="block">
        <span class="label">{{ $t('auth.password') }}</span>
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          class="input"
        />
      </label>

      <p v-if="error" role="alert" class="text-sm text-clay-700">
        {{ error || $t('auth.signInFailed') }}
      </p>

      <Button type="submit" size="lg" class="w-full" :disabled="submitting">
        {{ submitting ? $t('auth.signingIn') : $t('auth.signIn') }}
      </Button>

      <div class="flex items-center justify-between pt-1 text-sm">
        <RouterLink to="/forgot-password" class="text-neutral-500 hover:underline">
          {{ $t('reset.forgotTitle') }}
        </RouterLink>
        <RouterLink to="/signup" class="font-medium text-clay-600 hover:underline">
          {{ $t('auth.createAccount') }}
        </RouterLink>
      </div>
    </form>
  </AuthCard>
</template>
