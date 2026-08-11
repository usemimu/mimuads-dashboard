import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { emptyWizard, type WizardState } from '@/lib/wizard'

/** Campaign-wizard draft state (in memory). Reset when a campaign is created. */
export const useWizard = defineStore('wizard', () => {
  const state = reactive<WizardState>(emptyWizard())
  const step = ref(0)

  function reset() {
    Object.assign(state, emptyWizard())
    step.value = 0
  }
  /** Seed the screens step from the screen basket ("Use in campaign"). */
  function fromBasket(screenIds: string[]) {
    reset()
    state.isWildcard = false
    state.screenIds = [...screenIds]
  }

  return { state, step, reset, fromBasket }
})
