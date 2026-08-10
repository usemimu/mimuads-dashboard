import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const VALID_APP_ENVS = ['dev', 'staging', 'production']

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Env discipline at BUILD time (mirrors the boot-time check in src/env.ts):
  // fail loudly if VITE_APP_ENV is missing or invalid so no build ships without it.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const appEnv = env.VITE_APP_ENV
  if (!appEnv || !VALID_APP_ENVS.includes(appEnv)) {
    throw new Error(
      `[vite] VITE_APP_ENV="${appEnv ?? ''}" is missing or invalid. ` +
        `Set it to one of: ${VALID_APP_ENVS.join(', ')} (see .env.example).`,
    )
  }

  return {
    plugins: [vue(), vueDevTools()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
