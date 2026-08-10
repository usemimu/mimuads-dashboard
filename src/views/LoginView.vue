<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
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
  <div class="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <h1 class="font-display text-4xl font-semibold text-clay-600">{{ $t('app.name') }}</h1>
        <p class="mt-1 text-sm text-neutral-500">{{ $t('app.tagline') }}</p>
      </div>

      <form
        class="space-y-4 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm"
        @submit.prevent="onSubmit"
      >
        <h2 class="font-display text-2xl font-semibold text-neutral-900">
          {{ $t('auth.signIn') }}
        </h2>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-neutral-700">{{
            $t('auth.phoneOrEmail')
          }}</span>
          <input
            v-model="phoneOrEmail"
            type="text"
            autocomplete="username"
            required
            class="w-full rounded-lg border-neutral-300 focus:border-clay-400 focus:ring-clay-400"
          />
        </label>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-neutral-700">{{
            $t('auth.password')
          }}</span>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            class="w-full rounded-lg border-neutral-300 focus:border-clay-400 focus:ring-clay-400"
          />
        </label>

        <p v-if="error" role="alert" class="text-sm text-clay-700">
          {{ error || $t('auth.signInFailed') }}
        </p>

        <Button type="submit" size="lg" class="w-full" :disabled="submitting">
          {{ submitting ? $t('auth.signingIn') : $t('auth.signIn') }}
        </Button>
      </form>
    </div>
  </div>
</template>
