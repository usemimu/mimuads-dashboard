import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Pending org-invite token (in memory). Set when landing on /invite/:token so
 * that after sign-in/sign-up the onboarding guard sends the user to accept the
 * invite instead of the org-creation page (invite path bypasses Page 3).
 */
export const useInvite = defineStore('invite', () => {
  const token = ref<string | null>(null)
  return {
    token,
    set: (t: string) => (token.value = t),
    clear: () => (token.value = null),
  }
})
