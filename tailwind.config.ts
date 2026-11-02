import type { Config } from 'tailwindcss'
import forms from '@tailwindcss/forms'

/**
 * Brand system ported from mimu-web (the design source of truth). Palettes and
 * fonts: Plus Jakarta Sans (display/headings), Inter (body), Geist Mono (metrics/money).
 */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        clay: {
          50: '#FBF4F0',
          100: '#F4E3D7',
          200: '#E8C5AC',
          300: '#D9A07B',
          400: '#C8774C',
          500: '#B55430',
          600: '#974127',
          700: '#79321E',
          800: '#5A2416',
          900: '#37150C',
        },
        moss: {
          50: '#EEF5F1',
          100: '#D2E9DA',
          200: '#A4D2B4',
          300: '#6EB489',
          400: '#479462',
          500: '#2B7244',
          600: '#215836',
          700: '#184028',
          800: '#102A1B',
          900: '#091A10',
        },
        gold: {
          50: '#FCF7E8',
          100: '#F7ECC4',
          200: '#EDD88A',
          300: '#E0BF50',
          400: '#CFA430',
          500: '#B4881C',
          600: '#8D6A15',
          700: '#684E0F',
          800: '#44330A',
          900: '#261E05',
        },
        // Theme-aware ramp — the values live as RGB triplets in main.css
        // (`:root` = light, `[data-theme="dark"]` = dark) so every neutral
        // utility flips with the theme. `<alpha-value>` keeps opacity modifiers
        // (e.g. `bg-neutral-900/[0.04]`) working.
        neutral: {
          50: 'rgb(var(--n-50) / <alpha-value>)',
          100: 'rgb(var(--n-100) / <alpha-value>)',
          200: 'rgb(var(--n-200) / <alpha-value>)',
          300: 'rgb(var(--n-300) / <alpha-value>)',
          400: 'rgb(var(--n-400) / <alpha-value>)',
          500: 'rgb(var(--n-500) / <alpha-value>)',
          600: 'rgb(var(--n-600) / <alpha-value>)',
          700: 'rgb(var(--n-700) / <alpha-value>)',
          800: 'rgb(var(--n-800) / <alpha-value>)',
          900: 'rgb(var(--n-900) / <alpha-value>)',
        },
        // Card/panel surfaces (was hardcoded `bg-white`) — theme-aware so cards
        // go dark. Tailwind's real `white` is left alone for `text-white`.
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          raised: 'rgb(var(--surface-raised) / <alpha-value>)',
          sunken: 'rgb(var(--surface-sunken) / <alpha-value>)',
        },
        // Warm hairline borders (mirrors the admin console's --border tokens).
        line: {
          DEFAULT: 'rgb(var(--line) / <alpha-value>)',
          strong: 'rgb(var(--line-strong) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      // Restrained, warm-tinted elevation — an "editorial console" surface
      // language: cards lean on a hairline border with only a whisper of
      // shadow (admin-style), reserving real elevation (`pop`) for menus,
      // toasts and modals. Alpha uses the ink neutral so shadows read warm.
      boxShadow: {
        card: '0 1px 2px rgba(14, 13, 11, 0.05)',
        'card-hover': '0 4px 14px -4px rgba(14, 13, 11, 0.12)',
        pop: '0 4px 8px rgba(14, 13, 11, 0.06), 0 24px 48px -24px rgba(14, 13, 11, 0.22)',
        // Floating shell panels (X-style) — soft lift off the tinted background.
        float: '0 1px 2px rgba(14, 13, 11, 0.04), 0 12px 28px -14px rgba(14, 13, 11, 0.14)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out both',
      },
    },
  },
  plugins: [forms],
} satisfies Config
