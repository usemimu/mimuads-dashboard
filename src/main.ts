import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'

import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { queryClient } from './api/query'
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

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(i18n)
app.use(VueQueryPlugin, { queryClient })
app.use(router)

// Hard logout when a refresh can't rescue a 401: clear state, bounce to login.
registerAuthFailureHandler(() => {
  const session = useSession(pinia)
  session.clearSession()
  void router.replace({ name: 'login' })
})

app.mount('#app')
