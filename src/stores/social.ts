import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface SocialPending {
  signupToken: string
  email: string
  name?: string | null
}

export const useSocialStore = defineStore('social', () => {
  const pending = ref<SocialPending | null>(null)
  function set(data: SocialPending) { pending.value = data }
  function clear() { pending.value = null }
  return { pending, set, clear }
})
