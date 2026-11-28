import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'

import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { queryClient } from './api/query'
import {
  hydrateQueryCache,
  startPersistingQueryCache,
  clearPersistedQueryCache,
} from './api/query-persist'
import { registerAuthFailureHandler } from './api/client'
import { useSession } from './stores/session'

// Importing ./env runs the env-discipline checks — the app throws here (build
// and boot) if VITE_APP_ENV or a derived value is missing/invalid.
import './env'

// Apply the persisted theme before mount so there's no flash of the wrong
// palette on load. Defaults to light. The topbar toggle updates this + storage.
document.documentElement.setAttribute(
  'data-theme',
  localStorage.getItem('mimu-platform-theme') === 'dark' ? 'dark' : 'light',
)

// Restore the last query snapshot BEFORE mount so the first paint can come from
// cache (instant, and works offline); vue-query revalidates stale entries in
// the background.
hydrateQueryCache(queryClient)

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(i18n)
app.use(VueQueryPlugin, { queryClient })
app.use(router)

// Persist cache changes to localStorage (debounced) for the next load.
startPersistingQueryCache(queryClient)

// Hard logout when a refresh can't rescue a 401: clear state, bounce to login,
// and drop the persisted cache so the next user can't rehydrate this session.
registerAuthFailureHandler(() => {
  const session = useSession(pinia)
  session.clearSession()
  clearPersistedQueryCache()
  void router.replace({ name: 'login' })
})

app.mount('#app')
