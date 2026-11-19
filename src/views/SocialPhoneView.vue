<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AuthCard from '@/components/AuthCard.vue'
import Button from '@/components/ui/Button.vue'
import { useSocialStore } from '@/stores/social'
import { useToastStore } from '@/stores/toast'
import { isApiError } from '@/api/errors'
import { api } from '@/api/client'
import { SocialOtpRequestSchema } from '@/api/contracts/auth'

/** Phone-collection step for brand-new social sign-up users (backend returns
 *  `needs_phone`). Sends OTP via the social OTP endpoint, then hands off to
 *  the standard VerifyOtpView for code entry. */
const router = useRouter()
const { t } = useI18n()
const socialStore = useSocialStore()
const toast = useToastStore()

const localPhone = ref('')
const submitting = ref(false)

const phoneE164 = computed(() => '+234' + localPhone.value.replace(/\D/g, ''))

async function onSubmit() {
  const pending = socialStore.pending
  if (!pending) {
    router.replace({ name: 'signup' })
    return
  }
  submitting.value = true
  try {
    const body = SocialOtpRequestSchema.parse({ signupToken: pending.signupToken, phone: phoneE164.value })
    await api.post('/advertiser/auth/social/request-otp', body)
    router.push({ name: 'signup-verify', query: { phone: phoneE164.value } })
  } catch (e) {
    toast.error(isApiError(e) ? e.message : t('auth.socialFailed'))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthCard :step="1">
    <form class="space-y-5" @submit.prevent="onSubmit">
      <div>
        <h2 class="font-display text-2xl font-semibold text-neutral-900">{{ $t('social.phoneTitle') }}</h2>
        <p class="text-sm text-neutral-500">{{ $t('social.phoneBody') }}</p>
      </div>

      <label class="block">
        <span class="label">{{ $t('social.phone') }}</span>
        <div class="flex">
          <span class="inline-flex items-center rounded-l-xl border border-r-0 border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-600">
            +234
          </span>
          <input
            v-model="localPhone"
            inputmode="numeric"
            maxlength="10"
            required
            placeholder="8030000000"
            class="input rounded-l-none"
          />
        </div>
      </label>

      <Button type="submit" size="lg" class="w-full" :disabled="submitting || localPhone.length < 10">
        {{ submitting ? $t('social.submitting') : $t('social.next') }}
      </Button>
    </form>
  </AuthCard>
</template>
