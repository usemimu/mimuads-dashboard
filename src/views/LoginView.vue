<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AuthCard from '@/components/AuthCard.vue'
import Button from '@/components/ui/Button.vue'
import PasswordField from '@/components/ui/PasswordField.vue'
import SocialButtons from '@/components/ui/SocialButtons.vue'
import { useSession } from '@/stores/session'
import { useSocialStore } from '@/stores/social'
import { useToastStore } from '@/stores/toast'
import { isApiError } from '@/api/errors'
import { env } from '@/env'
import { initGoogle, googleSignIn, appleSignIn } from '@/composables/useSocialAuth'
import { useI18n } from 'vue-i18n'

const session = useSession()
const socialStore = useSocialStore()
const router = useRouter()
const route = useRoute()
const toast = useToastStore()
const { t } = useI18n()

const email = ref('')
const password = ref('')
const submitting = ref(false)
const socialBusy = ref(false)

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

async function handleSocialResult(promise: Promise<import('@/stores/session').SocialNeedsPhone | null>) {
  socialBusy.value = true
  try {
    const needsPhone = await promise
    if (needsPhone) {
      socialStore.set(needsPhone)
      router.push({ name: 'social-phone' })
    } else {
      const redirect = (route.query.redirect as string) || '/dashboard'
      router.replace(redirect)
    }
  } catch (e) {
    toast.error(isApiError(e) ? e.message : t('auth.socialFailed'))
  } finally {
    socialBusy.value = false
  }
}

function onGoogle() {
  handleSocialResult(
    new Promise((resolve, reject) => {
      initGoogle((idToken) => session.loginWithGoogle(idToken).then(resolve).catch(reject))
        .then(() => googleSignIn())
        .catch(reject)
    }),
  )
}

async function onApple() {
  socialBusy.value = true
  try {
    const result = await appleSignIn()
    if (!result) return
    await handleSocialResult(session.loginWithApple(result.identityToken, result.name))
  } catch (e) {
    toast.error(isApiError(e) ? e.message : t('auth.socialFailed'))
  } finally {
    socialBusy.value = false
  }
}

onMounted(() => {
  if (env.googleAuthClientId) {
    initGoogle((idToken) =>
      handleSocialResult(session.loginWithGoogle(idToken)),
    )
  }
})
</script>

<template>
  <AuthCard>
    <div class="space-y-6">
      <div>
        <h2 class="font-display text-2xl font-semibold text-neutral-900">{{ $t('auth.welcomeBack') }}</h2>
        <p class="mt-1.5 text-sm text-neutral-500">{{ $t('auth.loginSubtitle') }}</p>
      </div>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <label class="block">
          <span class="label">{{ $t('auth.email') }}</span>
          <input
            v-model="email"
            type="email"
            autocomplete="email"
            required
            placeholder="bola@example.com"
            class="input"
          />
        </label>

        <label class="block">
          <div class="mb-1.5 flex items-center justify-between">
            <span class="label mb-0">{{ $t('auth.password') }}</span>
            <RouterLink to="/forgot-password" class="text-sm font-medium text-clay-600 hover:underline">
              {{ $t('auth.forgotPassword') }}
            </RouterLink>
          </div>
          <PasswordField v-model="password" autocomplete="current-password" required :aria-label="$t('auth.password')" />
        </label>

        <Button type="submit" size="lg" class="w-full" :disabled="submitting">
          {{ submitting ? $t('auth.signingIn') : $t('auth.login') }}
        </Button>
      </form>

      <div v-if="env.googleAuthClientId || env.appleClientId" class="relative py-1 text-center">
        <div class="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line"></div>
        <span class="relative bg-surface px-3 text-xs uppercase tracking-wider text-neutral-400">
          {{ $t('auth.continueWith') }}
        </span>
      </div>

      <SocialButtons v-if="env.googleAuthClientId || env.appleClientId" :busy="socialBusy" @google="onGoogle" @apple="onApple" />
    </div>

    <template #footer>
      {{ $t('auth.noAccount') }}
      <RouterLink to="/signup" class="font-medium text-clay-600 hover:underline">{{ $t('auth.signUp') }}</RouterLink>
    </template>
  </AuthCard>
</template>
