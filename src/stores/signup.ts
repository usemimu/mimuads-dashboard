import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RequestOtpRequest } from '@/api/contracts/auth'

/**
 * Transient signup payload, in memory only (never persisted). Lets the OTP page
 * resend with the same signup block (name/password/position). Lost on reload —
 * the verify page then disables resend and offers "go back".
 */
export const useSignup = defineStore('signup', () => {
  const pending = ref<RequestOtpRequest | null>(null)
  function set(payload: RequestOtpRequest) {
    pending.value = payload
  }
  function clear() {
    pending.value = null
  }
  return { pending, set, clear }
})
