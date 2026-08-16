
import { createI18n } from 'vue-i18n'
import enNG from './en-NG'

/** en-NG default. Additional locales slot in here without touching components. */
export const i18n = createI18n({
  legacy: false,
  globalInjection: true, // enables `$t` in templates
  locale: 'en-NG',
  fallbackLocale: 'en-NG',
  messages: { 'en-NG': enNG },
})

export type MessageSchema = typeof enNG
