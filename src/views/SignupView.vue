<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { PhGoogleLogo, PhAppleLogo } from '@phosphor-icons/vue'
import AuthCard from '@/components/AuthCard.vue'
import Button from '@/components/ui/Button.vue'
import PasswordField from '@/components/ui/PasswordField.vue'
import SelectMenu from '@/components/ui/SelectMenu.vue'
import { requestOtp } from '@/api/onboarding'
import { isApiError } from '@/api/errors'
import { useSession } from '@/stores/session'
import { useSocialStore } from '@/stores/social'
import { useSignup } from '@/stores/signup'
import { useToastStore } from '@/stores/toast'
import { env } from '@/env'
import { initGoogle, googleSignIn, appleSignIn } from '@/composables/useSocialAuth'

/**
 * Page 1 — Create account (PRD §4.1). Creates a USER only (no org). Fields, order
 * and required flags are per the literal build spec; the intl phone selector is a
 * committed backend fast-follow (backend accepts +234 only for now — see
 * docs/IMPLEMENTATION-NOTES.md), so we fix the +234 prefix here.
 */
const router = useRouter()
const { tm, t } = useI18n()
const session = useSession()
const socialStore = useSocialStore()
const signupStore = useSignup()
const toast = useToastStore()
const socialBusy = ref(false)

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const localPhone = ref('') // 10 digits after +234
const position = ref('')
const password = ref('')
const confirm = ref('')
const submitting = ref(false)

const positions = computed(() => tm('signup.positions') as string[])
const passwordsMatch = computed(() => confirm.value.length === 0 || password.value === confirm.value)
const phoneE164 = computed(() => '+234' + localPhone.value.replace(/\D/g, ''))
const hasSocial = computed(() => !!(env.googleAuthClientId || env.appleClientId))

async function handleSocialResult(promise: Promise<import('@/stores/session').SocialNeedsPhone | null>) {
  socialBusy.value = true
  try {
    const needsPhone = await promise
    if (needsPhone) {
      socialStore.set(needsPhone)
      router.push({ name: 'social-phone' })
    } else {
      router.replace('/')
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
    initGoogle((idToken) => handleSocialResult(session.loginWithGoogle(idToken)))
  }
})

async function onSubmit() {
  if (!passwordsMatch.value || !position.value) return
  submitting.value = true
  try {
    const payload = {
      phone: phoneE164.value,
      email: email.value || undefined,
      signup: {
        name: `${firstName.value} ${lastName.value}`.trim(),
        password: password.value,
        position: position.value,
      },
    }
    await requestOtp(payload)
    signupStore.set(payload)
    router.push({ name: 'signup-verify', query: { phone: phoneE164.value } })
  } catch (e) {
    toast.error(isApiError(e) ? e.message : 'Could not create account.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthCard :step="0">
    <div class="space-y-5">
      <div>
        <h2 class="font-display text-2xl font-semibold text-neutral-900">{{ $t('signup.title') }}</h2>
        <p class="text-sm text-neutral-500">{{ $t('signup.subtitle') }}</p>
      </div>

      <!-- Social sign-in shortcuts -->
      <div v-if="hasSocial" class="flex flex-col gap-3">
        <Button
          v-if="env.googleAuthClientId"
          variant="secondary"
          size="lg"
          class="w-full"
          type="button"
          :disabled="socialBusy"
          @click="onGoogle"
        >
          <PhGoogleLogo :size="18" weight="bold" />
          {{ $t('auth.socialGoogle') }}
        </Button>
        <Button
          v-if="env.appleClientId"
          variant="secondary"
          size="lg"
          class="w-full"
          type="button"
          :disabled="socialBusy"
          @click="onApple"
        >
          <PhAppleLogo :size="18" weight="bold" />
          {{ $t('auth.socialApple') }}
        </Button>
      </div>

      <div v-if="hasSocial" class="relative py-1 text-center">
        <div class="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line"></div>
        <span class="relative bg-surface px-3 text-xs uppercase tracking-wider text-neutral-400">
          {{ $t('auth.orFillForm') }}
        </span>
      </div>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="label">{{ $t('signup.firstName') }}</span>
            <input v-model="firstName" required class="input" />
          </label>
          <label class="block">
            <span class="label">{{ $t('signup.lastName') }}</span>
            <input v-model="lastName" required class="input" />
          </label>
        </div>

        <label class="block">
          <span class="label">{{ $t('signup.email') }}</span>
          <input v-model="email" type="email" required autocomplete="email" class="input" />
        </label>

        <label class="block">
          <span class="label">{{ $t('signup.phone') }}</span>
          <div class="flex">
            <span class="inline-flex items-center rounded-l-xl border border-r-0 border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-600">+234</span>
            <input v-model="localPhone" inputmode="numeric" maxlength="10" required placeholder="8030000000" class="input rounded-l-none" />
          </div>
        </label>

        <label class="block">
          <span class="label">{{ $t('signup.positionLabel') }}</span>
          <SelectMenu v-model="position" :options="positions" :placeholder="$t('signup.positionPlaceholder')" :aria-label="$t('signup.positionLabel')" />
        </label>

        <label class="block">
          <span class="label">{{ $t('signup.password') }}</span>
          <PasswordField v-model="password" required :minlength="8" autocomplete="new-password" :aria-label="$t('signup.password')" />
        </label>

        <label class="block">
          <span class="label">{{ $t('signup.confirmPassword') }}</span>
          <PasswordField v-model="confirm" required autocomplete="new-password" :aria-label="$t('signup.confirmPassword')" />
        </label>
        <p v-if="!passwordsMatch" class="text-sm text-clay-700">{{ $t('signup.passwordsMustMatch') }}</p>

        <Button type="submit" size="lg" class="w-full" :disabled="submitting || !passwordsMatch || !position">
          {{ submitting ? $t('signup.creating') : $t('signup.next') }}
        </Button>
      </form>
    </div>

    <template #footer>
      {{ $t('auth.haveAccount') }}
      <RouterLink to="/login" class="font-medium text-clay-600 hover:underline">{{ $t('auth.signIn') }}</RouterLink>
    </template>
  </AuthCard>
</template>
