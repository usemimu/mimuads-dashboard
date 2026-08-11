<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthCard from '@/components/AuthCard.vue'
import Button from '@/components/ui/Button.vue'
import { useSession } from '@/stores/session'
import { useSignup } from '@/stores/signup'
import { requestOtp } from '@/api/onboarding'
import { isApiError } from '@/api/errors'

/** Page 2 — OTP verification (PRD §4.1). verify-otp establishes the cookie session. */
const route = useRoute()
const router = useRouter()
const session = useSession()
const signupStore = useSignup()

const phone = computed(() => (route.query.phone as string) || signupStore.pending?.phone || '')
const code = ref('')
const submitting = ref(false)
const error = ref<string | null>(null)

const cooldown = ref(0)
let timer: ReturnType<typeof setInterval> | undefined
function startCooldown() {
  cooldown.value = 30
  timer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0 && timer) clearInterval(timer)
  }, 1000)
}
onUnmounted(() => timer && clearInterval(timer))

async function onSubmit() {
  error.value = null
  submitting.value = true
  try {
    await session.verifyOtp(phone.value, code.value)
    signupStore.clear()
    // Session established (org=null for a new signup). The router guard routes
    // no-org users to org setup, verified users to the shell.
    router.replace('/')
  } catch (e) {
    error.value = isApiError(e) ? e.message : null
  } finally {
    submitting.value = false
  }
}

async function onResend() {
  if (cooldown.value > 0 || !signupStore.pending) return
  try {
    await requestOtp(signupStore.pending)
    startCooldown()
  } catch (e) {
    error.value = isApiError(e) ? e.message : null
  }
}
</script>

<template>
  <AuthCard :step="0">
    <form class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <h2 class="font-display text-2xl font-semibold text-neutral-900">{{ $t('verify.title') }}</h2>
        <p class="text-sm text-neutral-500">{{ $t('verify.body') }}</p>
      </div>

      <label class="block">
        <span class="mb-1 block text-sm font-medium text-neutral-700">{{ $t('verify.code') }}</span>
        <input
          v-model="code"
          inputmode="numeric"
          maxlength="6"
          required
          autocomplete="one-time-code"
          class="w-full rounded-lg border-neutral-300 text-center font-mono text-2xl tracking-[0.4em] focus:border-clay-400 focus:ring-clay-400"
        />
      </label>

      <p v-if="error" role="alert" class="text-sm text-clay-700">{{ error || $t('verify.failed') }}</p>

      <Button type="submit" size="lg" class="w-full" :disabled="submitting || code.length !== 6">
        {{ submitting ? $t('verify.verifying') : $t('verify.submit') }}
      </Button>

      <div class="flex items-center justify-between text-sm">
        <button
          type="button"
          class="text-clay-600 hover:underline disabled:text-neutral-400 disabled:no-underline"
          :disabled="cooldown > 0 || !signupStore.pending"
          @click="onResend"
        >
          {{ cooldown > 0 ? $t('verify.resendIn', { seconds: cooldown }) : $t('verify.resend') }}
        </button>
        <RouterLink to="/signup" class="text-neutral-500 hover:underline">{{
          $t('verify.wrongAddress')
        }}</RouterLink>
      </div>
    </form>
  </AuthCard>
</template>
