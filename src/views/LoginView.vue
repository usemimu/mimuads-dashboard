<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AuthCard from '@/components/AuthCard.vue'
import Button from '@/components/ui/Button.vue'
import PasswordField from '@/components/ui/PasswordField.vue'
import { useSession } from '@/stores/session'
import { useToastStore } from '@/stores/toast'
import { isApiError } from '@/api/errors'
import { useI18n } from 'vue-i18n'

const session = useSession()
const router = useRouter()
const route = useRoute()
const toast = useToastStore()
const { t } = useI18n()

const email = ref('')
const password = ref('')
const submitting = ref(false)

async function onSubmit() {
  submitting.value = true
  try {
    await session.loginWithPassword(email.value, password.value)
    const redirect = (route.query.redirect as string) || '/dashboard'
    router.replace(redirect)
  } catch (e) {
    toast.error(isApiError(e) ? e.message : t('auth.signInFailed'))
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
        <span class="label">{{ $t('auth.email') }}</span>
        <input
          v-model="email"
          type="email"
          autocomplete="email"
          required
          class="input"
        />
      </label>

      <label class="block">
        <span class="label">{{ $t('auth.password') }}</span>
        <PasswordField v-model="password" autocomplete="current-password" required :aria-label="$t('auth.password')" />
      </label>

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
